class ExamManager {
  constructor() {
    this.examData = [];
    this.currentQuestionIndex = 0;
    this.userResponded = false;
    this.examDate = window.location.href.split("#").at(-1)
    this.examFinish = false
    this.timer
  }

  async initialize(timerEnabled) {
    await this.saveExam()

    this.examData = await this.fetchExamData(this.examDate);
    this.renderBasePage(timerEnabled);
    this.displayQuestion();
    if (timerEnabled) {
      this.timer = new Timer(this.finishExam.bind(this));
      this.timer.start()
    }

    this.displayBoardWithQuestions()
  }

  async saveExam() {
    const existingExamDate = window.localStorage.getItem("examDate");

    if (existingExamDate) {
      const toast = new ToastNotification();

      const answer = await toast.showConfirmation();
      if (!answer) {
        this.examDate = existingExamDate
      } else {
        localStorage.clear()
      }
    }

    if (!existingExamDate || existingExamDate !== this.examDate) {
      window.localStorage.setItem("examDate", this.examDate);
    }
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
    const createButton = (text, onClickHandler, buttonId = "finishButton") => {
      const button = document.createElement("button");
      button.id = buttonId;
      button.className = "bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300";
      button.textContent = text;
      button.onclick = onClickHandler;
      return button;
    };

    const existingButton = document.getElementById("finishButton");
    if (existingButton) existingButton.remove();

    if (this.examFinish) {
      const finishButton = createButton("Retornar", () => {
        window.location.href = "http://localhost/poscomp-lab/";
        window.localStorage.clear()
      });
      navDiv.appendChild(finishButton);
    } else if (this.currentQuestionIndex === this.examData.length - 1 && this.userRespondedAllQuestions()) {
      const finishButton = createButton("Finalizar Prova", this.finishExam.bind(this));
      navDiv.appendChild(finishButton);
    }
  }


  displayQuestion() {
    const questionsDiv = document.getElementById("questions");
    questionsDiv.innerHTML = "";
    const questionRenderer = new QuestionRenderer(this.examData[this.currentQuestionIndex], this.submitAnswer.bind(this));

    if (this.examFinish) {
      questionRenderer.finishExam();
    }

    questionRenderer.render(questionsDiv);
  }

  changeQuestion(direction) {
    if (direction > 1 && direction > -1) {
      this.currentQuestionIndex = direction - 1
    }
    else {
      this.currentQuestionIndex = Math.min(Math.max(this.currentQuestionIndex + direction, 0), this.examData.length - 1);
    }

    this.displayQuestion();
    this.renderNavigationButtons();
  }

  submitAnswer(questionId, selectedOption) {
    if (selectedOption) {
      localStorage.setItem(`answer-${questionId}`, selectedOption);
      this.userResponded = this.userRespondedAllQuestions();
      new ToastNotification(questionId, selectedOption).show();
      this.renderNavigationButtons();
      this.displayBoardWithQuestions()
    } else {
      console.log("Por favor, selecione uma alternativa antes de enviar.");
    }
  }

  userRespondedAllQuestions() {
    return this.examData.length === Object.keys(localStorage).filter(key => key.startsWith("answer-")).length;
  }

  getQuestionsAnsweredByUser() {
    const items = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);

      const questionId = key.split("-").at(-1);

      items.push({
        id: questionId,
        value: value
      });
    }
    return items;
  }


  displayBoardWithQuestions() {
    const questions = this.getQuestions();
    const totalQuestions = this.examData.length;
    const rows = this.examData.length;
    const cols = 5;
    const board = document.getElementById('board');

    board.innerHTML = '';

    let questionNumberAt = 1;

    for (let i = 0; i < rows; i++) {
      const row = document.createElement('div');
      row.classList.add('flex');

      for (let j = 0; j < cols; j++) {
        const questionIndex = i * cols + j;
        if (questionIndex >= totalQuestions) continue;

        const question = questions[questionIndex];
        const questionNumber = (questionNumberAt++).toString().padStart(2, '0');

        const ball = document.createElement('div');
        ball.className = this.getClassForQuestion(question);
        ball.textContent = questionNumber;

        ball.addEventListener('click', () => {
          this.changeQuestion(question.id);
        });

        row.appendChild(ball);
      }
      board.appendChild(row);

    }
  }

  getClassForQuestion(question) {
    const baseClasses = 'question-ball rounded-full cursor-pointer w-8 h-8 flex items-center justify-center text-white mr-2';

    if (question.answered) {
      if (this.examFinish) {
        return question.answered === question.gabarito
          ? `${baseClasses} bg-green-500`
          : `${baseClasses} bg-red-500`;
      } else {
        return `${baseClasses} bg-green-500`;
      }
    }

    return `${baseClasses} bg-gray-500`;
  }

  getQuestions() {
    if (this.examFinish) {
      return this.examData
    } else {
      const userQuestions = this.getQuestionsAnsweredByUser();
      const questions = this.examData.map((question) => {
        const userQuestion = userQuestions.find((userQ) => userQ.id == question.id);

        return {
          id: question.id,
          questionNumber: question.id,
          answered: userQuestion ? !!userQuestion.value : false
        };
      });
      return questions;
    }

  }

  finishExam() {
    const correctAnswers = this.examData.reduce((acc, { id, gabarito }) => {
      return acc + (localStorage.getItem(`answer-${id}`) === gabarito ? 1 : 0);
    }, 0);


    this.timer.stopCount()
    this.setTrueFinishExam()
    this.displayFinishPage(correctAnswers);
  }

  setTrueFinishExam() {
    this.examFinish = true
  }

  showQuestionDetails() {
    const userQuestions = this.getQuestionsAnsweredByUser();
    const questions = this.examData;

    const questionWithUserResponse = questions.map((question) => {
      const questionDTO = userQuestions.find((userQuestion) => parseInt(userQuestion.id) === question.id);

      return {
        id: question.id,
        questionNumber: question.id,
        answered: questionDTO ? questionDTO.value : null,
        content: question.content,
        gabarito: question.gabarito ? question.gabarito.toLowerCase() : null,
        alternatives: question.alternatives
      };
    });

    this.examData = questionWithUserResponse
    this.renderBasePage()
    this.displayQuestion()
    this.displayBoardWithQuestions()

  }

  displayFinishPage(correctAnswers) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <div id="finishPage">
      <h1 class="text-3xl font-bold mb-4">Simulado Finalizado!</h1>
      <p class="text-xl mb-6">Você acertou ${correctAnswers} de ${this.examData.length} questões.</p>
      <button id="view-details-btn" class="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600">Ver Resultados Detalhados</button>
      <button class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 ml-4" onclick="localStorage.clear(); window.location.href = 'http://localhost/poscomp-lab/index.html'">Finalizar Simulado</button>
    </div>
  `;

    const viewDetailsButton = document.getElementById("view-details-btn");
    viewDetailsButton.addEventListener("click", () => {
      this.showQuestionDetails();
    });
  }

}


class QuestionRenderer extends ExamManager {
  constructor(question, submitAnswer) {
    super();
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

    if (!this.examFinish) {
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "flex justify-between mt-4";
      const submitButton = document.createElement("button");
      submitButton.className = "bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600";
      submitButton.textContent = "Salvar Resposta";
      submitButton.onclick = () => this.submitAnswer(this.question.id, this.getSelectedOption());
      buttonContainer.appendChild(submitButton);

      questionContainer.appendChild(buttonContainer)
    }

    parentDiv.appendChild(questionContainer);
  }

  renderAlternatives() {
    return this.question.alternatives.map((alt, index) => {
      const key = Object.keys(alt)[0];
      const value = alt[key];
      const isChecked = this.defaultValue(this.question) === key;

      let labelClass = "text-gray-700";

      if (this.examFinish) {
        if (key === this.question.gabarito) {
          labelClass = "text-green-600";
        } else if (key === this.question.answered) {
          labelClass = "text-red-600";
        }
      }

      return `
      <li class="flex items-center space-x-3">
        <input type="radio" name="question-${this.question.id}" ${isChecked ? "checked" : ""} value="${key}" id="alt-${this.question.id}-${index}" class="form-radio">
        <label for="alt-${this.question.id}-${index}" class="${labelClass} font-bold">${key}: ${value}</label>
      </li>
    `;
    }).join("");
  }

  finishExam() {
    this.examFinish = true;
  }


  defaultValue(question) {
    const storedValue = localStorage.getItem(`answer-${question.id}`);
    const matchingAlternative = question.alternatives.find((alt) => {
      const key = Object.keys(alt)[0];
      return key === storedValue;
    });

    return matchingAlternative ? storedValue : null;
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
    this.interval = null;
  }

  start() {
    this.loadTimerFromStorage();

    this.interval = setInterval(() => {
      this.timeLeft -= 1;
      this.saveTimerToStorage();

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

  saveTimerToStorage() {
    localStorage.setItem('timer', this.timeLeft);
  }

  loadTimerFromStorage() {
    const savedTime = localStorage.getItem('timer');
    if (savedTime) {
      this.timeLeft = parseInt(savedTime, 10);
    }
  }

  stopCount() {
    clearInterval(this.interval);
    this.saveTimerToStorage();
    this.timeLeft = 0;
    this.updateTimerDisplay();
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

  showConfirmation(callback) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "fixed inset-0 flex justify-center items-center bg-gray-700 bg-opacity-50";

      const modalContent = document.createElement("div");
      modalContent.className = "bg-white p-6 rounded-lg shadow-lg flex flex-col items-center";
      modalContent.innerHTML = `
      <p>Você já tem um exame salvo. Deseja sobrescrever?</p>
      <div class="flex space-x-4">
        <button id="yesBtn" class="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600" id="yesButton">Sim</button>
        <button id="noBtn" class="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600" id="noButton">Não</button>
      </div>
    `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      document.getElementById("yesBtn").addEventListener("click", () => {
        resolve(true);
        modal.remove();
      });
      document.getElementById("noBtn").addEventListener("click", () => {
        resolve(false);
        modal.remove();
      });
    });
  }

}

function startExam(withTimer = false) {
  const examManager = new ExamManager();
  examManager.initialize(withTimer);
}
