const fetch = require('node-fetch');  // Para fazer o download dos arquivos
const fs = require('fs');  // Para salvar os arquivos localmente
const path = require('path');  // Para manipulação de diretórios
const pdfParse = require('pdf-parse');

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Falha ao baixar o arquivo: ${res.statusText}`);
    }

    const buffer = await res.buffer();
    fs.writeFileSync(filename, buffer);
    console.log(`Arquivo salvo como: ${filename}`)
  } catch (error) {
    console.error(`Erro ao baixar o arquivo: ${error.message}`);
  }
}

async function downloadExamFiles(ano) {
  for (let i = 0; i < 18; i++) {
    const year = ano + i;
    const cadernoUrl = `https://raw.githubusercontent.com/amimaro/Provas-POSCOMP/master/${year}/caderno_${year}.pdf`;
    const gabaritoUrl = `https://raw.githubusercontent.com/amimaro/Provas-POSCOMP/master/${year}/gabarito_${year}.pdf`;

    const cadernoFilename = path.join(__dirname, `${year}_caderno_${year}.pdf`);
    const gabaritoFilename = path.join(__dirname, `${year}_gabarito_${year}.pdf`);

    await downloadFile(cadernoUrl, cadernoFilename);
    await downloadFile(gabaritoUrl, gabaritoFilename);

    const caderno = await extractBlockAndProcess(cadernoFilename, 'caderno');
    const gabarito = await extractBlockAndProcess(gabaritoFilename, 'gabarito');

    if (caderno && gabarito) {
      const right_json_exam = caderno.map((question) => {
        const matchingAnswer = gabarito.find((gabaritoItem) => gabaritoItem.question === question.questionId);
        if (matchingAnswer) {
          return {
            id: question.questionId,
            content: question.questionContent,
            alternatives: question.alternatives,
            categoria: matchingAnswer.category,
            gabarito: matchingAnswer.answer
          };
        }
      }).filter(item => item !== undefined);

      const jsonFilename = path.join(__dirname, "assets", "provas", "poscomp", `${year}.json`);
      console.log(right_json_exam)
      createJsonFile(right_json_exam, jsonFilename);
      console.log(`Arquivo JSON criado: ${jsonFilename}`);
    } else {
      console.log(`Erro ao processar os arquivos PDF do ano ${year}.`);
    }
  }
}

const replacements = {
  "푥": "x",
  "푙": "l",
  "표": "o",
  "푔": "g",
  "∙": "*",
  "−": "-",
  "→": "->",
  "푓": "f",
  "푥": "x",
  "퐹": "F",
  "푥": "x",
  "푦": "y",
  "푧": "z",
};


function normalizeText(input, replacements) {
  return input.replace(/[\u{1100}-\u{11FF}\u{A960}-\u{A97F}\u{AC00}-\u{D7AF}²√푓푥]/gu,
    char => replacements[char] || char);
}


async function extractBlockAndProcess(pdfPath, type) {
  const pdfBuffer = fs.readFileSync(pdfPath);

  try {
    const data = await pdfParse(pdfBuffer);
    let block, result;

    if (type === 'caderno') {
      block = extractForCaderno(data.text);
      result = getCadernoForPdf(block);
      clearCadernoForPdf(result)
    } else if (type === 'gabarito') {
      block = extractForGabarito(data.text);
      result = getGabaritoForPdf(block);
    }

    return result;
  } catch (error) {
    console.error('Erro ao processar o PDF:', error);
    return null;
  }
}
function clearCadernoForPdf(result) {
  const regexQuestionContent = /QUESTÃO\s+\d+\s*–\s*(.*?)\s*A\)/;

  result.map((question) => {
    const match = question.questionContent.match(regexQuestionContent);
    if (match) {
      question.questionContent = match[1].trim();
    }
  });
}

(async () => {
  const caderno = await extractBlockAndProcess('./caderno_2023.pdf', 'caderno');
  const gabarito = await extractBlockAndProcess('./gabarito_2023.pdf', 'gabarito');
  if (caderno && gabarito) {
    const right_json_exam = caderno.map((question) => {
      const matchingAnswer = gabarito.find((gabaritoItem) => gabaritoItem.question === question.questionId);
      if (matchingAnswer) {
        return {
          id: question.questionId,
          content: question.questionContent,
          alternatives: question.alternatives,
          categoria: matchingAnswer.category,
          gabarito: matchingAnswer.answer
        };
      }
    }).filter(item => item !== undefined);


    createJsonFile(right_json_exam)
  } else {
    console.log('Erro ao processar um dos arquivos PDF.');
  }
})();

function clearCadernoForPdf(result) {
  const regexQuestionContent = /QUESTÃO\s+\d+\s*–\s*(.*?)\s*A\)/;

  result.map((question) => {
    const match = question.questionContent.match(regexQuestionContent);
    if (match) {
      question.questionContent = match[1].trim();
    }
  });
}



function createJsonFile(data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync("assets/provas/poscomp/2022.json", jsonData);
    console.log("Arquivo JSON criado com sucesso!");
  } catch (error) {
    console.error("Erro ao criar o arquivo JSON:", error);
  }
}

function extractForCaderno(text) {
  const pattern = /QUESTÃO [\d]+[\s\S]*/g;
  const match = text.match(pattern);

  return match ? match[0] : "Bloco não encontrado!";
}


function extractForGabarito(text) {
  const pattern = /\(\*\) Questão\(ões\) anulada\(s\) - a pontuação será revertida a todos os candidatos[\s\S]*?Imprimir/g;
  const match = text.match(pattern);

  return match ? match[0] : "Bloco não encontrado!";
}

function getCadernoForPdf(block) {
  const lines = block.split("\n");
  const questions = [];
  let currentQuestion = null;
  let questionContent = '';
  let alternatives = [];

  lines.forEach((line, index) => {
    line = line.trim();
    const regex = /(\d{1,2})\/(\d{1,2})\/(\d{4})(\d{1,2}):(\d{2}):(\d{2})/;

    if (line === "") return;
    if (line.includes("Fundatec")) return;
    if (line.includes("761_POSCOMP_NS_DM")) return;
    if (line.includes("EXAME")) return;
    if (regex.test(line)) return;

    if (line.includes("QUESTÃO")) {
      if (currentQuestion) {
        currentQuestion.questionContent = normalizeText(questionContent.trim(), replacements)
        currentQuestion.alternatives = alternatives;
        questions.push(currentQuestion);
      }

      let questionId = parseInt(line.split(" ").filter(item => item != "")[1])

      currentQuestion = {
        questionId: questionId,
        questionContent: '',
        alternatives: []
      };
      questionContent = '';
      alternatives = [];
    }

    questionContent += ' ' + line;

    if (line.match(/^[A-E]\)/)) {
      const alternativeMatch = line.match(/^([A-E])\) (.+)/);
      if (alternativeMatch) {
        alternatives.push({ [alternativeMatch[1].toLowerCase()]: alternativeMatch[2].trim() });
      }
    }
  });

  if (currentQuestion) {
    currentQuestion.questionContent = normalizeText(questionContent.trim(), replacements)
    currentQuestion.alternatives = alternatives;
    questions.push(currentQuestion);
  }

  return questions;
}


function getGabaritoForPdf(block) {
  const lines = block.split("\n").filter(line => line.trim() !== "" &&
    !line.includes("https://fundatec.org.br/portal/concursos/") &&
    !line.includes("Fundatec") &&
    !line.includes("Imprimir"));

  const questionLines = [];
  let currentQuestion = { question: 0, answer: '', category: '' };

  lines.forEach(line => {
    if (/^\d+$/.test(line.trim())) {
      if (currentQuestion.question !== 0) {
        questionLines.push(currentQuestion);
      }
      currentQuestion = { question: parseInt(line.trim()), answer: '', category: '' };
    } else {
      currentQuestion.answer = line.trim().charAt(0);
      currentQuestion.category = line.trim().slice(1).trim();
    }
  });

  if (currentQuestion.question !== 0) {
    questionLines.push(currentQuestion);
  }

  return questionLines;
}
const ano = 2022;
downloadExamFiles(ano);