const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server);
const secretKey = process.env.SECRETKEY;
const usuarios = {};
var usuariosConectados = {};
var usuarioId = undefined;
var salitaCall = undefined;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set(__dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

db.connect(err =>{
  if (err){
    console.log("error en la base de datos: ", err);
    return;
  }
  console.log("conectado a la base de datos");
})


function conToken(req, res, next){
  const header = req.get("Authorization");
  const token = header && header.split(" ")[1];
  console.log(token)

  if (!token) return res.status(401).json({error: "sin token"});

  jwt.verify(token, secretKey, (err, user)=>{
    if (err) return res.status(403).json({error: "token invalido"});

    req.user = user;
    next();
  })
}




app.get('/', (req, res)=>{
  res.render("index");
});

app.get("/main", (req, res) => {
  const cont = fs.readFileSync('mensajes.txt', 'utf-8');
  const orden = cont.split('\n');
  res.render('main', {data: orden});

});

app.get('/contactos', (req, res)=>{
  res.render("contactos");
});

app.get('/obtenerContactos', conToken,(req, res)=>{
  const query = 'SELECT numContact FROM Contactos WHERE usuario_id = (?)';

  db.query(query, [usuarioId], (err, result)=>{
    if (err){
      console.error(err);
    }
    return res.status(200).json({ data: result });
  });
});

app.post('/sumarContacto', conToken, (req, res)=>{
  const {usuarioPres,contactoNuevo} = req.body;
  console.log("contacto que lo añade: "+usuarioPres);
  console.log("contacto a agregar: "+contactoNuevo)

  const query = 'INSERT INTO Contactos (usuario_id, numContact) VALUES (?,?)'
  db.query(query, [usuarioPres, contactoNuevo], (err, result)=>{
    if (err) return res.status(403).json({err});
    return res.status(200).json({ exito: true });
  })
});

app.delete("/eliminarContacto", (req,res)=>{

  const {usuarioBorrar, usuarioQuienBorra} = req.body;
  const query = 'DELETE FROM Contactos WHERE usuario_id = ? AND numContact = ?'
  db.query(query, [usuarioQuienBorra,usuarioBorrar], (err, result)=>{
    if (err) return res.status(403).json({err});
    return res.status(200).json({ exito: true });
  });
})

app.get("/dataUser", conToken, (req, res) => {
  res.json({ usuario: req.user });
  usuarioId = req.user.id;

  const query = 'SELECT nombre,userId FROM Usuarios'
  db.query(query, (err, result)=>{
    if (err) return res.status(500).send("Error en el ID");

    for(x = 0; result.length > x; x++){
      usuarios[result[x].nombre] = result[x].userId;
    }
    console.log(usuarios);
  });
});



app.post("/registrarse",async(req, res) => {
  const { nombre, contra} = req.body;

  if(!nombre || !contra ){
    console.log("error, datos vacios")
  }

  try{
    const hash = await bcrypt.hash(contra, 10);
    const query = 'INSERT INTO Usuarios (nombre, contra) VALUES (?,?)';
    db.query(query, [nombre, hash], (err, result)=>{
      if (err){
        console.error("error insertando los datos", err);
        return res.status(500).send("error insertando los datos")
      }
      return res.status(200).json({ exito: true });
    });
  } catch(error) {
    console.log("error :" + error)
  }
});

app.post('/iniciarSesion', async (req, res)=>{
  const { nomb, pass} = req.body;
  const query = 'SELECT * FROM Usuarios WHERE nombre = ?'
  db.query(query, [nomb], async (err, result)=>{
    if(err){
      console.error("error: "+ err)
    }

    const user = result[0]

    if (user === undefined){
      console.error("Usuario no encontrado")
      return res.status(200).json({ exito: false });
    }


    const match = await bcrypt.compare(pass, user.contra);

    if(!match){
      return res.status(401).json({ exito: false });
    }

    const token = jwt.sign(
      {id: user.userId, nombre: user.nombre},
      secretKey
    );

    res.json({ exito: true, token });

    
  });
});

io.on('connection', (socket) => {
  usuariosConectados[usuarioId] = socket.id;

  socket.on('mensajePrivado', ({ destino, mensaje, boton})=>{
    console.log(mensaje);
    const socketDestino = usuariosConectados[destino];
    if (socketDestino) {
        io.to(socketDestino).emit("mensajePrivado", ({mensaje,boton}));
    } else {
      console.log("Usuario no conectado:", destino);
    }

  });

  socket.on("sala",({sala, destino})=>{
    const socketDestino = usuariosConectados[destino];
    console.log(sala)
    if (socketDestino) {
        io.to(socketDestino).emit("sala", ({sala}));
    } else {
      console.log("Usuario no conectado:", destino);
    }
    salitaCall = sala;
  });

  // Al unirse a una sala
  socket.on("join", (room) => {
    socket.join(room);
    const clients = io.sockets.adapter.rooms.get(room);
    const numClients = clients ? clients.size : 0;

    console.log(`Usuario ${socket.id} se unió a la sala ${room}`);

    // Avisamos si ya hay otro cliente
    if (numClients > 1) {
      socket.to(room).emit("ready");
    }
  });

  socket.on("signal", ({ room, data }) => {
    socket.to(room).emit("signal", data);
  });

});





server.listen(3000, ()=>{
  console.log("escuchando en el puerto 3000");
})
