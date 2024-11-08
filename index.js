function iniciarExame(prova) {
  window.location.href = `http://localhost/poscomp-lab/prova.html#${prova}`
}

function checkLocalStorage() {
  console.log("hgellou")
  if (localStorage.length > 0) {
    alert("Deseja retornar a sua antiga prova?")
    window.localStorage.getItem("examDate");

  }
}

window.onload = () => {
  checkLocalStorage();
};
