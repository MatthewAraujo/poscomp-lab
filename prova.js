let examData = [];
let currentQuestionIndex = 0;
let userResponded = false

async function getExam(exam) {
  try {
    const response = await fetch(`http://localhost/poscomp-lab/assets/provas/poscomp/${exam}.json`, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status}`);
    }
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Erro ao obter exame:", error);
  }
}

function setupPage(timer) {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = "";

  const mainContainer = document.createElement("div");

  const title = document.createElement("h1");
  title.className = "text-2xl font-bold mb-4";
  title.textContent = "Questões do Exame";
  mainContainer.appendChild(title);

  const questionsDiv = document.createElement("div");
  questionsDiv.id = "questions";
  questionsDiv.className = "space-y-6";
  mainContainer.appendChild(questionsDiv);

  const navDiv = document.createElement("div");
  navDiv.id = "navigation";
  navDiv.className = "flex justify-between mt-6";
  mainContainer.appendChild(navDiv);

  appDiv.appendChild(mainContainer);

  if (timer) {
    const timerDiv = document.createElement("div");
    timerDiv.id = "timer";
    timerDiv.className = "absolute top-6 right-6 text-xl font-bold bg-black text-white px-4 py-2 rounded-lg shadow-md";
    appDiv.appendChild(timerDiv);
  }

  renderNavigationButtons();
}

function renderNavigationButtons() {
  const navDiv = document.getElementById("navigation");

  navDiv.innerHTML = "";

  if (currentQuestionIndex > 0) {
    const prevButton = document.createElement("button");
    prevButton.className = "bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400";
    prevButton.textContent = "← Anterior";
    prevButton.onclick = () => changeQuestion(-1);
    navDiv.appendChild(prevButton);
  }

  if (currentQuestionIndex < examData.length - 1) {
    const nextButton = document.createElement("button");
    nextButton.className = "bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400";
    nextButton.textContent = "Próxima →";
    nextButton.onclick = () => changeQuestion(1);
    navDiv.appendChild(nextButton);
  }
}

function displayQuestion(index) {
  const questionsDiv = document.getElementById("questions");
  questionsDiv.innerHTML = "";

  const question = examData[index];
  if (question) insertQuestion(question);
}

function changeQuestion(direction) {
  console.log("Direction: ", direction);
  currentQuestionIndex += direction;

  if (currentQuestionIndex < 0) currentQuestionIndex = 0;
  if (currentQuestionIndex >= examData.length) currentQuestionIndex = examData.length - 1;

  displayQuestion(currentQuestionIndex);
  renderNavigationButtons();
}


function insertQuestion(question) {
  const questionAlreadyAsked = localStorage.getItem(`answer-${question.id}`)
  const questionsDiv = document.getElementById("questions");

  const questionContainer = document.createElement("div");
  questionContainer.className = "p-4 bg-gray-50 rounded-lg shadow-md";

  const questionText = document.createElement("p");
  questionText.className = "text-lg font-semibold text-gray-800 mb-3";
  questionText.textContent = `${question.id}. ${question.content}`;
  questionContainer.appendChild(questionText);

  const alternativesList = document.createElement("ul");
  alternativesList.className = "space-y-2";

  for (const alternative of question.alternatives) {
    const [key, value] = Object.entries(alternative)[0];

    const alternativeItem = document.createElement("li");

    const label = document.createElement("label");
    label.className = "flex items-center space-x-2";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `question-${question.questionId}`;
    input.value = key;
    input.className = "form-radio text-blue-500";
    if (questionAlreadyAsked && key === questionAlreadyAsked) {
      input.defaultChecked = true;
    }

    const text = document.createElement("span");
    text.textContent = `${key.toUpperCase()}: ${value}`;

    label.appendChild(input);
    label.appendChild(text);
    alternativeItem.appendChild(label);
    alternativesList.appendChild(alternativeItem);
  }


  questionContainer.appendChild(alternativesList);

  const buttonContainer = document.createElement("div");
  buttonContainer.className = "flex justify-between mt-4";

  const submitButton = document.createElement("button");
  submitButton.className = "bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300";
  submitButton.textContent = "Enviar";
  submitButton.onclick = () => submitAnswer(question.id);
  buttonContainer.appendChild(submitButton);

  questionContainer.appendChild(buttonContainer);
  questionsDiv.appendChild(questionContainer);
}

function renderFinishButton() {
  const navDiv = document.getElementById("navigation");

  const existingFinishButton = document.getElementById("finishButton");
  if (existingFinishButton) {
    existingFinishButton.remove();
  }

  if (currentQuestionIndex === examData.length - 1 && userRespondedAllQuestions()) {
    const finishButton = document.createElement("button");
    finishButton.id = "finishButton";
    finishButton.className = "bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300";
    finishButton.textContent = "Finalizar Prova";
    finishButton.onclick = finishExam;

    navDiv.appendChild(finishButton);
  }
}


function userRespondedAllQuestions() {
  return localStorage.length === examData.length;
}

function submitAnswer(questionId) {
  const selectedOption = document.querySelector(`input[name="question-${questionId}"]:checked`);
  if (selectedOption) {
    saveAnswer(questionId, selectedOption.value.toLocaleLowerCase())
  } else {
    console.log("Por favor, selecione uma alternativa antes de enviar.");
  }
  userResponded = userRespondedAllQuestions()
  toast({ id: questionId, question: selectedOption.value.toLocaleLowerCase() })
  renderFinishButton()
}



function startTimer() {
  let hours = 3;
  let minutes = 59;
  let seconds = 60;

  const timerDiv = document.getElementById("timer");

  const timer = setInterval(function () {
    seconds--;

    if (seconds < 0) {
      minutes--;
      seconds = 59;
      if (minutes < 0) {
        hours--;
        minutes = 59;
        if (hours < 0) {
          clearInterval(timer);
          finishExam()
        }
      }
    }

    timerDiv.textContent = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, 1000);
}

async function startExam(timer) {
  const exam_type = window.location.href.split("#").at(-1)
  examData = await getExam(exam_type)
  setupPage(timer)
  displayQuestion(currentQuestionIndex);
  if (timer) {
    startTimer()
  }
}

function finishExam() {
  const template = examData.map(exam => {
    return {
      "gabarito": exam.gabarito,
      "id": exam.id
    };
  });

  let correctAnswers = 0;

  const user_alternatives = template.map((answer) => {
    const userAnswer = localStorage.getItem(`answer-${answer.id}`);

    if (userAnswer && userAnswer === answer.gabarito) {
      correctAnswers++;
    }

    return {
      "id": answer.id,
      "alternative": userAnswer ? userAnswer : "Nenhuma resposta",
      "isCorrect": userAnswer === answer.gabarito
    };
  });

  displayFinishPage(correctAnswers)
}

function displayFinishPage(correctAnswers) {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = "";

  const mainContainer = document.createElement("div");

  const title = document.createElement("h1");
  title.className = "text-3xl font-bold mb-4";
  title.textContent = "Simulado Finalizado!";
  mainContainer.appendChild(title);

  const resultText = document.createElement("p");
  resultText.className = "text-xl mb-6";
  resultText.textContent = `Você acertou ${correctAnswers} de ${examData.length} questões.`;
  mainContainer.appendChild(resultText);

  // Botão para ver resultados detalhados (se necessário)
  const viewResultsButton = document.createElement("button");
  viewResultsButton.className = "bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600";
  viewResultsButton.textContent = "Ver Resultados Detalhados";
  viewResultsButton.onclick = () => {
    // Aqui você pode adicionar lógica para exibir mais detalhes, por exemplo, resultados por questão
    alert("Exibindo resultados detalhados...");
  };
  mainContainer.appendChild(viewResultsButton);

  // Botão para finalizar o simulado e sair
  const finishButton = document.createElement("button");
  finishButton.className = "bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 ml-4";
  finishButton.textContent = "Finalizar Simulado";
  finishButton.onclick = () => {
    localStorage.clear()
    window.location.href = "http://localhost/poscomp-lab/index.html"
  };
  mainContainer.appendChild(finishButton);

  appDiv.appendChild(mainContainer);
}


function saveAnswer(id, alternative) {
  const answer = `${alternative}`
  window.localStorage.setItem(`answer-${id}`, answer)
}

function toast(question) {
  const toastContainer = document.createElement("div");
  toastContainer.className = "fixed bottom-6 right-6 bg-green-500 text-white py-3 px-6 rounded-lg shadow-lg flex items-center space-x-3";

  const icon = document.createElement("span");
  icon.className = "text-xl font-bold";
  icon.textContent = "✓";

  const message = document.createElement("span");
  message.textContent = `Você selecionou a questão ${question.id}: ${question.question}`;

  toastContainer.appendChild(icon);
  toastContainer.appendChild(message);

  document.body.appendChild(toastContainer);

  setTimeout(() => {
    toastContainer.classList.add("opacity-0");
    setTimeout(() => {
      toastContainer.remove();
    }, 300);
  }, 3000);
}