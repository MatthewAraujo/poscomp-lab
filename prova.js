class ExamManager {
  constructor() {
    this.examData = [];
    this.currentQuestionIndex = 0;
    this.userResponded = false;
    this.examDate = window.location.href.split("#").at(-1)
  }

  async initialize(timerEnabled) {
    this.examData = await this.fetchExamData(this.examDate);
    this.renderBasePage(timerEnabled);
    this.displayQuestion();
    if (timerEnabled) new Timer(this.finishExam.bind(this)).start();
  }

  async fetchExamData(exam) {
    try {
      const response = await fetch(`http://localhost/poscomp-lab/assets/provas/poscomp/${exam}.json`, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Erro ao buscar dados: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Erro ao obter exame:", error);
      return [];
    }
  }

  renderBasePage(timerEnabled) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = "";

    const mainContainer = document.createElement("div");
    mainContainer.innerHTML = `
      <h1 class="text-2xl font-bold mb-4">Questões do Exame</h1>
      <div id="questions" class="space-y-6"></div>
      <div id="navigation" class="flex justify-between mt-6"></div>
    `;
    appDiv.appendChild(mainContainer);

    if (timerEnabled) {
      const timerDiv = document.createElement("div");
      timerDiv.id = "timer";
      timerDiv.className = "absolute top-6 right-6 text-xl font-bold bg-black text-white px-4 py-2 rounded-lg shadow-md";
      appDiv.appendChild(timerDiv);
    }

    this.renderNavigationButtons();
  }

  renderNavigationButtons() {
    const navDiv = document.getElementById("navigation");
    navDiv.innerHTML = "";

    if (this.currentQuestionIndex > 0) {
      const prevButton = this.createNavButton("← Anterior", () => this.changeQuestion(-1));
      navDiv.appendChild(prevButton);
    }

    if (this.currentQuestionIndex < this.examData.length - 1) {
      const nextButton = this.createNavButton("Próxima →", () => this.changeQuestion(1));
      navDiv.appendChild(nextButton);
    }

    this.renderFinishButton(navDiv);
  }

  createNavButton(text, onClick) {
    const button = document.createElement("button");
    button.className = "bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400";
    button.textContent = text;
    button.onclick = onClick;
    return button;
  }

  renderFinishButton(navDiv) {
    const finishButton = document.getElementById("finishButton");
    if (finishButton) finishButton.remove();

    if (this.currentQuestionIndex === this.examData.length - 1 && this.userRespondedAllQuestions()) {
      const finishButton = document.createElement("button");
      finishButton.id = "finishButton";
      finishButton.className = "bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300";
      finishButton.textContent = "Finalizar Prova";
      finishButton.onclick = this.finishExam.bind(this);
      navDiv.appendChild(finishButton);
    }
  }

  displayQuestion() {
    const questionsDiv = document.getElementById("questions");
    questionsDiv.innerHTML = "";
    new QuestionRenderer(this.examData[this.currentQuestionIndex], this.submitAnswer.bind(this)).render(questionsDiv);
  }

  changeQuestion(direction) {
    this.currentQuestionIndex = Math.min(Math.max(this.currentQuestionIndex + direction, 0), this.examData.length - 1);
    this.displayQuestion();
    this.renderNavigationButtons();
  }

  submitAnswer(questionId, selectedOption) {
    if (selectedOption) {
      localStorage.setItem(`answer-${questionId}`, selectedOption);
      this.userResponded = this.userRespondedAllQuestions();
      new ToastNotification(questionId, selectedOption).show();
      this.renderNavigationButtons();
    } else {
      console.log("Por favor, selecione uma alternativa antes de enviar.");
    }
  }

  userRespondedAllQuestions() {
    return this.examData.length === Object.keys(localStorage).filter(key => key.startsWith("answer-")).length;
  }

  finishExam() {
    const correctAnswers = this.examData.reduce((acc, { id, gabarito }) => {
      return acc + (localStorage.getItem(`answer-${id}`) === gabarito ? 1 : 0);
    }, 0);

    this.displayFinishPage(correctAnswers);
  }

  displayFinishPage(correctAnswers) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <div>
        <h1 class="text-3xl font-bold mb-4">Simulado Finalizado!</h1>
        <p class="text-xl mb-6">Você acertou ${correctAnswers} de ${this.examData.length} questões.</p>
        <button class="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600" onclick="alert('Exibindo resultados detalhados...')">Ver Resultados Detalhados</button>
        <button class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 ml-4" onclick="localStorage.clear(); window.location.href = 'http://localhost/poscomp-lab/index.html'">Finalizar Simulado</button>
      </div>
    `;
  }
}

class QuestionRenderer {
  constructor(question, submitAnswer) {
    this.question = question;
    this.submitAnswer = submitAnswer;
  }

  render(parentDiv) {
    const questionContainer = document.createElement("div");
    questionContainer.className = "p-4 bg-gray-50 rounded-lg shadow-md";

    questionContainer.innerHTML = `
      <p class="text-lg font-semibold text-gray-800 mb-3">${this.question.id}. ${this.question.content}</p>
      <ul class="space-y-2">${this.renderAlternatives()}</ul>
    `;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex justify-between mt-4";
    const submitButton = document.createElement("button");
    submitButton.className = "bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600";
    submitButton.textContent = "Salvar Resposta";
    submitButton.onclick = () => this.submitAnswer(this.question.id, this.getSelectedOption());
    buttonContainer.appendChild(submitButton);

    questionContainer.appendChild(buttonContainer);
    parentDiv.appendChild(questionContainer);
  }

  renderAlternatives() {
    return this.question.alternatives.map((alt, index) => {
      const key = Object.keys(alt)[0];
      const value = alt[key];

      return `
      <li class="flex items-center space-x-3">
        <input type="radio" name="question-${this.question.id}" value="${value}" id="alt-${this.question.id}-${index}" class="form-radio">
        <label for="alt-${this.question.id}-${index}" class="text-gray-700">${key}: ${value}</label>
      </li>
    `;
    }).join("");
  }



  getSelectedOption() {
    const selected = document.querySelector(`input[name="question-${this.question.id}"]:checked`);
    return selected ? selected.value : null;
  }
}

class Timer {
  constructor(onFinish) {
    this.onFinish = onFinish;
    this.timeLeft = 60 * 60; // 1 hour in seconds
  }

  start() {
    this.interval = setInterval(() => {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        clearInterval(this.interval);
        this.onFinish();
      }
      this.updateTimerDisplay();
    }, 1000);
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    document.getElementById("timer").textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
}

class ToastNotification {
  constructor(questionId, answer) {
    this.questionId = questionId;
    this.answer = answer;
  }

  show() {
    const notification = document.createElement("div");
    notification.className = "toast fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-lg shadow-md";
    notification.textContent = `Resposta para a questão ${this.questionId} salva com sucesso!`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 1000);
    }, 1500);
  }
}

// Iniciar o exame com tempo ou sem tempo
function startExam(withTimer = false) {
  const examManager = new ExamManager();
  examManager.initialize(withTimer);
}
