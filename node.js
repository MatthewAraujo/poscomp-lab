// let ano = 2002

// for (i = 0; i < 22; i++) {
//   let carderno = `https://github.com/amimaro/Provas-POSCOMP/blob/master/${ano + i}/gabarito_2023.pdf`
//   let gabarito = `https://github.com/amimaro/Provas-POSCOMP/blob/master/${ano + i}/caderno_2023.pdf`

//   console.log(carderno)
//   console.log(gabarito)

// }
const { create } = require('domain');
const fs = require('fs');
const pdfParse = require('pdf-parse');

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

// Exemplo de uso com processamento de caderno e gabarito
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
    }).filter(item => item !== undefined); // Remove undefined entries caso não haja correspondência


    createJsonFile(right_json_exam)
  } else {
    console.log('Erro ao processar um dos arquivos PDF.');
  }
})();

function clearCadernoForPdf(result) {
  const regexQuestionContent = /QUESTÃO\s+\d+\s*–\s*(.*?)\s*A\)/; // Captura o conteúdo entre "QUESTÃO [NÚMERO]" e "A)"

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
        currentQuestion.questionContent = questionContent.trim();
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
    currentQuestion.questionContent = questionContent.trim();
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