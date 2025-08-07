const socket = io();

function limpiar() {
    const input = document.getElementById('chat');
    input.innerHTML = '';
}

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const salir = document.getElementById("salir");
    const msj = document.getElementById('msj');
    const chat = document.getElementById('chat');
    const idUsuario = document.getElementById('idContacto');
    const contactoForm = document.getElementById('contacto');


    const res = await fetch("/dataUser", {
    method: "GET",
    headers: {
        "Authorization": "Bearer " + token
    }
    });

    const data = await res.json();

    if (!token) {
        alert("No estás logeado");
        window.location.href = "/";
        return;
    }

    contactoForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const item = document.createElement('li');
        item.textContent = "yo: "+msj.value;
        chat.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
        socket.emit("mensajePrivado", {
            destino: idUsuario.value,
            mensaje: data.usuario.nombre + ": " +msj.value
        });

    });


    socket.on("mensajePrivado", (mensaje) => {
        const item = document.createElement('li');
        item.textContent = mensaje;
        chat.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

    salir.addEventListener("submit", ()=>{
        localStorage.removeItem("token");
        window.location.href = "/";
    });


    try {
        if (res.ok) {
        document.getElementById("saludo").innerText = `Hola, ${data.usuario.nombre}`;
        } else {
        alert("Token inválido o expirado");
        localStorage.removeItem("token");
        window.location.href = "/";
        }
    } catch (err) {
        console.error("Error accediendo a /api/usuario:", err);
        alert("Error de red");
    }  
});