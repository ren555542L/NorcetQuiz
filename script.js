const signin = document.getElementById("sign");
signin.addEventListener("click", function() {
    alert("Sign in functionality is not implemented yet.");
});

const quizState = {
  allQuestions: [],
  selectedQuestions: [],
  answers: {},
  reviewQuestions: new Set(),
  currentIndex: 0,
  seconds: 0,
  timerInterval: null
};

const quizElements = {
  startScreen: document.querySelector("#quizStartScreen"),
  mainScreen: document.querySelector("#quizMainScreen"),
  resultScreen: document.querySelector("#quizResultScreen"),
  answerReview: document.querySelector("#quizAnswerReview"),

  questionCount: document.querySelector("#quizQuestionCount"),
  year: document.querySelector("#quizYear"),
  shuffle: document.querySelector("#quizShuffle"),
  error: document.querySelector("#quizError"),

  startButton: document.querySelector("#quizStartButton"),
  previousButton: document.querySelector("#quizPreviousButton"),
  nextButton: document.querySelector("#quizNextButton"),
  markButton: document.querySelector("#quizMarkButton"),
  submitButton: document.querySelector("#quizSubmitButton"),

  questionNumber: document.querySelector("#quizQuestionNumber"),
  questionYear: document.querySelector("#quizQuestionYear"),
  questionText: document.querySelector("#quizQuestionText"),
  questionImage: document.querySelector("#quizQuestionImage"),
  options: document.querySelector("#quizOptions"),
  progressBar: document.querySelector("#quizProgressBar"),
  palette: document.querySelector("#quizQuestionPalette"),
  answeredCount: document.querySelector("#quizAnsweredCount"),
  timer: document.querySelector("#quizTimer"),

  scorePercentage: document.querySelector("#quizScorePercentage"),
  correctCount: document.querySelector("#quizCorrectCount"),
  incorrectCount: document.querySelector("#quizIncorrectCount"),
  unansweredCount: document.querySelector("#quizUnansweredCount"),
  resultTime: document.querySelector("#quizResultTime"),

  reviewAnswersButton: document.querySelector("#quizReviewAnswersButton"),
  restartButton: document.querySelector("#quizRestartButton"),
  backToResultButton: document.querySelector("#quizBackToResultButton"),
  reviewList: document.querySelector("#quizReviewList")
};

async function loadQuizQuestions() {
  try {
    const jsonPath = "./norcet_questions_flat.json";

    console.log("Loading questions from:", jsonPath);

    const response = await fetch(jsonPath);

    console.log("Response status:", response.status);
    console.log("Response URL:", response.url);

    if (!response.ok) {
      throw new Error(
        `Question file request failed: ${response.status} ${response.statusText}`
      );
    }

    const questions = await response.json();

    console.log("Loaded JSON:", questions);

    if (!Array.isArray(questions)) {
      throw new Error(
        "The JSON file does not contain a direct array of questions."
      );
    }

    quizState.allQuestions = questions.filter(question => {
      return (
        question.disabled !== true &&
        typeof question.question === "string" &&
        Array.isArray(question.options) &&
        question.options.length >= 2
      );
    });

    console.log(
      `Loaded ${quizState.allQuestions.length} usable questions.`
    );

    if (quizState.allQuestions.length === 0) {
      throw new Error(
        "The JSON loaded successfully, but no usable questions were found."
      );
    }
  } catch (error) {
    console.error("NorQuiz loading error:", error);

    quizElements.error.textContent =
      `Questions could not be loaded: ${error.message}`;

    quizElements.startButton.disabled = true;
  }
}

function shuffleQuizQuestions(questions) {
  const shuffledQuestions = [...questions];

  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffledQuestions[i], shuffledQuestions[randomIndex]] = [
      shuffledQuestions[randomIndex],
      shuffledQuestions[i]
    ];
  }

  return shuffledQuestions;
}

function showQuizScreen(screenToShow) {
  const screens = [
    quizElements.startScreen,
    quizElements.mainScreen,
    quizElements.resultScreen,
    quizElements.answerReview
  ];

  screens.forEach(screen => {
    screen.classList.add("quiz-hidden");
  });

  screenToShow.classList.remove("quiz-hidden");
}

function startQuiz() {
  quizElements.error.textContent = "";

  const selectedYear = quizElements.year.value;
  const requestedCount = Number(quizElements.questionCount.value);

  let availableQuestions = quizState.allQuestions.filter(question => {
    return (
      selectedYear === "all" ||
      String(question.year) === selectedYear
    );
  });

  if (availableQuestions.length === 0) {
    quizElements.error.textContent =
      "No questions are available for the selected year.";

    return;
  }

  if (quizElements.shuffle.checked) {
    availableQuestions = shuffleQuizQuestions(availableQuestions);
  }

  quizState.selectedQuestions = availableQuestions.slice(
    0,
    Math.min(requestedCount, availableQuestions.length)
  );

  quizState.answers = {};
  quizState.reviewQuestions = new Set();
  quizState.currentIndex = 0;
  quizState.seconds = 0;

  createQuestionPalette();
  displayQuestion();
  startQuizTimer();

  showQuizScreen(quizElements.mainScreen);
}

function displayQuestion() {
  const question = quizState.selectedQuestions[quizState.currentIndex];
  const totalQuestions = quizState.selectedQuestions.length;

  if (!question) {
    return;
  }

  quizElements.questionNumber.textContent =
    `Question ${quizState.currentIndex + 1} of ${totalQuestions}`;

  quizElements.questionYear.textContent =
    `NORCET ${question.year}`;

  quizElements.questionText.textContent = question.question;

  if (question.image && question.disabled !== true) {
    quizElements.questionImage.src = question.image;
    quizElements.questionImage.alt =
      `Image for question ${quizState.currentIndex + 1}`;

    quizElements.questionImage.classList.remove("quiz-hidden");
  } else {
    quizElements.questionImage.removeAttribute("src");
    quizElements.questionImage.classList.add("quiz-hidden");
  }
  quizElements.progressBar.style.width =
    `${((quizState.currentIndex + 1) / totalQuestions) * 100}%`;

  quizElements.options.innerHTML = "";

  question.options.forEach((option, index) => {
    const optionNumber = index + 1;

    const label = document.createElement("label");
    label.className = "quiz-option";

    if (quizState.answers[question.id] === optionNumber) {
      label.classList.add("selected");
    }

    const radio = document.createElement("input");

    radio.type = "radio";
    radio.name = `quizQuestion${question.id}`;
    radio.value = optionNumber;
    radio.checked =
      quizState.answers[question.id] === optionNumber;

    radio.addEventListener("change", () => {
      quizState.answers[question.id] = optionNumber;

      displayQuestion();
      saveQuizProgress();
    });

    const optionLetter = document.createElement("span");
    optionLetter.className = "quiz-option-letter";
    optionLetter.textContent = String.fromCharCode(65 + index);

    const optionText = document.createElement("span");
    optionText.className = "quiz-option-text";
    optionText.textContent = option;

    label.append(radio, optionLetter, optionText);
    quizElements.options.append(label);
  });

  quizElements.previousButton.disabled =
    quizState.currentIndex === 0;

  quizElements.nextButton.textContent =
    quizState.currentIndex === totalQuestions - 1
      ? "Finish"
      : "Next";

  const isMarked = quizState.reviewQuestions.has(question.id);

  quizElements.markButton.textContent = isMarked
    ? "Remove Review Mark"
    : "Mark for Review";

  updateQuestionPalette();
  updateAnsweredCount();
}

function createQuestionPalette() {
  quizElements.palette.innerHTML = "";

  quizState.selectedQuestions.forEach((question, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "quiz-palette-button";
    button.textContent = index + 1;

    button.addEventListener("click", () => {
      quizState.currentIndex = index;
      displayQuestion();
    });

    quizElements.palette.append(button);
  });
}

function updateQuestionPalette() {
  const paletteButtons =
    quizElements.palette.querySelectorAll(".quiz-palette-button");

  paletteButtons.forEach((button, index) => {
    const question = quizState.selectedQuestions[index];

    button.className = "quiz-palette-button";

    if (quizState.answers[question.id] !== undefined) {
      button.classList.add("answered");
    }

    if (quizState.reviewQuestions.has(question.id)) {
      button.classList.add("review");
    }

    if (index === quizState.currentIndex) {
      button.classList.add("current");
    }
  });
}

function updateAnsweredCount() {
  const answeredQuestions = Object.keys(quizState.answers).length;

  quizElements.answeredCount.textContent =
    `${answeredQuestions}/${quizState.selectedQuestions.length}`;
}

function showPreviousQuestion() {
  if (quizState.currentIndex > 0) {
    quizState.currentIndex--;
    displayQuestion();
  }
}

function showNextQuestion() {
  if (
    quizState.currentIndex <
    quizState.selectedQuestions.length - 1
  ) {
    quizState.currentIndex++;
    displayQuestion();
  } else {
    submitQuiz();
  }
}

function markQuestionForReview() {
  const question =
    quizState.selectedQuestions[quizState.currentIndex];

  if (quizState.reviewQuestions.has(question.id)) {
    quizState.reviewQuestions.delete(question.id);
  } else {
    quizState.reviewQuestions.add(question.id);
  }

  displayQuestion();
  saveQuizProgress();
}

function startQuizTimer() {
  clearInterval(quizState.timerInterval);

  quizElements.timer.textContent = "00:00";

  quizState.timerInterval = setInterval(() => {
    quizState.seconds++;
    quizElements.timer.textContent = formatQuizTime(
      quizState.seconds
    );
  }, 1000);
}

function formatQuizTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function submitQuiz() {
  const answered = Object.keys(quizState.answers).length;
  const unanswered =
    quizState.selectedQuestions.length - answered;

  const shouldSubmit = confirm(
    unanswered > 0
      ? `You still have ${unanswered} unanswered questions. Submit quiz?`
      : "Submit your quiz?"
  );

  if (!shouldSubmit) {
    return;
  }

  clearInterval(quizState.timerInterval);

  let correct = 0;
  let incorrect = 0;

  quizState.selectedQuestions.forEach(question => {
    const selectedAnswer = quizState.answers[question.id];

    if (selectedAnswer === undefined) {
      return;
    }

    if (
      Number(selectedAnswer) === Number(question.correctOption)
    ) {
      correct++;
    } else {
      incorrect++;
    }
  });

  const percentage = Math.round(
    (correct / quizState.selectedQuestions.length) * 100
  );

  quizElements.scorePercentage.textContent =
    `${percentage}%`;

  quizElements.correctCount.textContent = correct;
  quizElements.incorrectCount.textContent = incorrect;
  quizElements.unansweredCount.textContent = unanswered;
  quizElements.resultTime.textContent = formatQuizTime(
    quizState.seconds
  );

  localStorage.removeItem("norcetQuizProgress");

  showQuizScreen(quizElements.resultScreen);
}

function displayAnswerReview() {
  quizElements.reviewList.innerHTML = "";

  quizState.selectedQuestions.forEach((question, index) => {
    const selectedAnswer = quizState.answers[question.id];
    const correctOption = Number(question.correctOption);

    let status = "unanswered";

    if (selectedAnswer !== undefined) {
      status =
        Number(selectedAnswer) === correctOption
          ? "correct"
          : "incorrect";
    }

    const reviewCard = document.createElement("article");

    reviewCard.className =
      `quiz-review-card ${status}`;

    const questionHeading = document.createElement("h3");

    questionHeading.textContent =
      `${index + 1}. ${question.question}`;

    const userAnswer = document.createElement("p");

    userAnswer.innerHTML = `
      <strong>Your answer:</strong>
      ${
        selectedAnswer === undefined
          ? "Not attempted"
          : question.options[selectedAnswer - 1]
      }
    `;

    const correctAnswer = document.createElement("p");

    correctAnswer.innerHTML = `
      <strong>Correct answer:</strong>
      ${question.options[correctOption - 1]}
    `;

    reviewCard.append(
      questionHeading,
      userAnswer,
      correctAnswer
    );

    quizElements.reviewList.append(reviewCard);
  });

  showQuizScreen(quizElements.answerReview);
}

function restartQuiz() {
  clearInterval(quizState.timerInterval);

  quizState.selectedQuestions = [];
  quizState.answers = {};
  quizState.reviewQuestions = new Set();
  quizState.currentIndex = 0;
  quizState.seconds = 0;

  showQuizScreen(quizElements.startScreen);
}

function saveQuizProgress() {
  const progress = {
    answers: quizState.answers,
    currentIndex: quizState.currentIndex,
    reviewQuestions: [...quizState.reviewQuestions]
  };

  localStorage.setItem(
    "norcetQuizProgress",
    JSON.stringify(progress)
  );
}

quizElements.startButton.addEventListener("click", startQuiz);

quizElements.previousButton.addEventListener(
  "click",
  showPreviousQuestion
);

quizElements.nextButton.addEventListener(
  "click",
  showNextQuestion
);

quizElements.markButton.addEventListener(
  "click",
  markQuestionForReview
);

quizElements.submitButton.addEventListener(
  "click",
  submitQuiz
);

quizElements.reviewAnswersButton.addEventListener(
  "click",
  displayAnswerReview
);

quizElements.restartButton.addEventListener(
  "click",
  restartQuiz
);

quizElements.backToResultButton.addEventListener(
  "click",
  () => showQuizScreen(quizElements.resultScreen)
);

loadQuizQuestions();