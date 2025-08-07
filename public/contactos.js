const socket = io();
document.addEventListener("DOMContentLoaded", async()=>{
    const token = localStorage.getItem("token");
    const salir = document.getElementById("salir");
    const sumarContacto = document.getElementById("sumarContacto"); 
    const mensajes = document.getElementById('mensajes');
    const ul = document.getElementById("listaContactos");

    const peer = new RTCPeerConnection();
    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    var salonLlamada = undefined;


    const res = await fetch("/dataUser", {
    method: "GET",
    headers: {
        "Authorization": "Bearer " + token
    }
    });

    const data = await res.json();
    console.log(data);
    const idActual = data.usuario.id

    if (!token) {
        alert("No estás logeado");
        window.location.href = "/";
        return;
    }


    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
    });
    function hablandoCon(idContact, idBoton){

        const msj = document.createElement("input");
        const botonEnviar = document.createElement("button");
        const botonSalir = document.createElement("button");
        const botonLlamada = document.createElement("button");
        const sas = document.getElementById(`${idBoton}`);
        const itemsChat = document.getElementById("itemsChat");
        const lol = document.createElement("li");
        var room = Math.random().toString(36).substring(2, 8);
        lol.id = "lol-"+idBoton;
        msj.placeholder = "Hablando con: " + idBoton;
        botonEnviar.textContent = "Enviar";
        botonSalir.textContent = "Salir de chat";
        botonLlamada.textContent = "Videollamada";


        botonLlamada.addEventListener("click",()=>{
            botonLlamada.disabled = true;
            peer.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
            };

            peer.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("signal", {
                room,
                data: { type: "candidate", candidate: event.candidate }
                });
            }
            };


            socket.on("signal", async (data) => {
                if (data.type === "offer") {
                    await peer.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    socket.emit("signal", { room, data: peer.localDescription });
                } else if (data.type === "answer") {
                    await peer.setRemoteDescription(new RTCSessionDescription(data));
                } else if (data.type === "candidate") {
                    await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            });

            socket.emit("join", room);

            socket.on("ready", async () => {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit("signal", { room, data: peer.localDescription });
            });


            socket.emit("mensajePrivado",{
                destino: idContact,
                mensaje: `${data.usuario.nombre} a iniciado una videollamada de id ${room}`,
                boton: true
            });
            socket.emit("sala",({sala : room, destino: idContact}));

        });


        botonEnviar.addEventListener("click", ()=>{
            const item = document.createElement('li');
            item.textContent = "yo: "+msj.value;
            lol.appendChild(item);
            window.scrollTo(0, document.body.scrollHeight);
            socket.emit("mensajePrivado", {
                destino: idContact,
                mensaje: data.usuario.nombre + ": " +msj.value,
            });
        });


        socket.on("mensajePrivado", (data) => {
            const item = document.createElement('li');
            item.textContent = data.mensaje;
            lol.appendChild(item);
            window.scrollTo(0, document.body.scrollHeight);
        });

        socket.on("sala", (data)=>{
            console.log("numero de sala que se conecto el otro cliente: "+ data.sala)
            salonLlamada = data.sala;
        });


        socket.on("mensajePrivado", ( data ) => {
            console.log("estado del boton: " + data.boton);

            if(data.boton){

                const botonUnirse = document.createElement('button');
                const item = document.createElement('li');

                botonUnirse.textContent = "Unirse";
                botonUnirse.addEventListener("click",()=>{
                    console.log(salonLlamada);

                    room = salonLlamada;
                    peer.ontrack = event => {
                    remoteVideo.srcObject = event.streams[0];
                    };

                    peer.onicecandidate = event => {
                    if (event.candidate) {
                        socket.emit("signal", {
                        room,
                        data: { type: "candidate", candidate: event.candidate }
                        });
                    }
                    };


                    socket.on("signal", async (data) => {
                        if (data.type === "offer") {
                            await peer.setRemoteDescription(new RTCSessionDescription(data));
                            const answer = await peer.createAnswer();
                            await peer.setLocalDescription(answer);
                            socket.emit("signal", { room, data: peer.localDescription });
                        } else if (data.type === "answer") {
                            await peer.setRemoteDescription(new RTCSessionDescription(data));
                        } else if (data.type === "candidate") {
                            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
                        }
                    });

                    socket.emit("join", room);

                    socket.on("ready", async () => {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit("signal", { room, data: peer.localDescription });
                    });
                });
                item.appendChild(botonUnirse);
                lol.appendChild(item);
            }
        });

        botonSalir.addEventListener("click", ()=>{
            lol.innerHTML= '';
            itemsChat.removeChild(lol);
            sas.disabled = false;

        });
        lol.appendChild(msj);
        lol.appendChild(botonEnviar);
        lol.appendChild(botonLlamada);
        lol.appendChild(botonSalir);
        itemsChat.appendChild(lol);


    }
    async function eliminarContact(idContact, idEliminar){

        const usuarioBorrar = idContact;
        const usuarioQuienBorra = idActual;
        const res = await fetch("/eliminarContacto",{
            method:"DELETE",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({usuarioBorrar, usuarioQuienBorra})
        });

        const data = res.json();
        if (data.exito){
            alert("contacto eliminado");
        }
    }


    sumarContacto.addEventListener("submit", async(e)=>{
        e.preventDefault();
        const contactoNuevo = document.getElementById("contactoNuevo").value;

        const usuarioPres = idActual;
        
        const res = await fetch("/sumarContacto",{
            method : "POST",
            headers: {"Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({usuarioPres,contactoNuevo})
        });

        const data = await res.json();

        if(data.exito){
            alert("Contacto agregado");
        }else{
            alert("Error en la red");
            console.error(data)
        }

    });

    const lista = await fetch('/obtenerContactos', {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })

    const result = await lista.json();

    const contactos = result.data;

    if (Array.isArray(contactos)) {


        contactos.forEach(contacto => {
            const li = document.createElement("li");
            var hablarCon = document.createElement("button");
            const eliminar = document.createElement("button");
            hablarCon.id = "sas"+contacto.numContact;
            eliminar.id = "sacar a sas"+contacto.numContact;
            var idBoton = hablarCon.id;
            var idSacar = eliminar.id;
            

            hablarCon.textContent = "Hablar";
            eliminar.textContent ="Eliminar contacto"
            li.textContent ="Numero de Contacto: " + contacto.numContact + " ";

            li.appendChild(hablarCon);
            li.appendChild(eliminar);
            ul.appendChild(li);

            hablarCon.addEventListener("click", ()=>{
                hablarCon.disabled = true;
                hablandoCon(contacto.numContact, idBoton);
            });
            eliminar.addEventListener("click",()=>{
                li.removeChild(eliminar);
                eliminarContact(contacto.numContact, idSacar);
            });



        });
    } else {
        console.error("No se recibió un array de contactos:", contactos);
    }

    salir.addEventListener("submit", ()=>{
        localStorage.removeItem("token");
        window.location.href = "/";
    });

    try {
        if (res.ok) {
            document.getElementById("saludo").innerText = `Hola, ${data.usuario.nombre}, tu numero es: ${data.usuario.id}`;
        }else{
            alert("Token inválido o expirado");
            localStorage.removeItem("token");
            window.location.href = "/";
        }
    } catch (err) {
        console.error("Error accediendo:", err);
        alert("Error de red");
    } 
})