
const registrarse = document.getElementById('registrarse');
const iniciarSesion = document.getElementById('iniciarSesion');

registrarse.addEventListener("submit",async (e)=>{
    e.preventDefault();
    const nombre = document.getElementById('nomb').value;
    const contra = document.getElementById('cont').value;
    try{
        const res = await fetch("/registrarse", {
            method: "POST",
            headers: {"Content-Type": "application/json" },
            body: JSON.stringify({ nombre, contra })
        });
        const data = await res.json();

        if (data.exito){
            alert("Registrado")
        }
        else{
            alert("Error al registrarse")
        }
    } catch(error){
        console.error("error interno: "+ error)
        alert("error interno o de red")
    }
});

iniciarSesion.addEventListener("submit", async(e)=>{
    e.preventDefault();
    const nomb = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    try{
        const res = await fetch("/iniciarSesion", {
            method: "POST",
            headers:{"Content-Type": "application/json" },
            body: JSON.stringify({ nomb, pass })
        });
        const data = await res.json();


        if (data.exito){
            alert("Sesion iniciada")
            localStorage.setItem("token", data.token);
            window.location.href = "/contactos";
        }else{
            alert("Datos incorrectos")
        }
    }
    catch(err){
        console.error("error logeandose: "+err)
    }
});
