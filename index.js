function iniciarExame(prova) {
  window.location.href = `http://localhost/poscomp-lab/prova.html#${prova}`
}

function checkLocalStorage() {
  const currentHash = window.location.hash
  const savedExamDate = window.localStorage.getItem("examDate");

  if (!currentHash && localStorage.length > 0) {
    const userConfirmed = confirm("Deseja continuar na sua prova antiga?");
    if (userConfirmed) {
      window.location.href = `https://matthewaraujo.github.io/poscomp-lab/prova.html#${savedExamDate}`;
    }
  }
}


window.onload = () => {
  checkLocalStorage();
};
