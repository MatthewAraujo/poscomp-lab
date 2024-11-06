// let ano = 2002

// for (i = 0; i < 22; i++) {
//   let carderno = `https://github.com/amimaro/Provas-POSCOMP/blob/master/${ano + i}/gabarito_2023.pdf`
//   let gabarito = `https://github.com/amimaro/Provas-POSCOMP/blob/master/${ano + i}/caderno_2023.pdf`

//   console.log(carderno)
//   console.log(gabarito)

// }
const fs = require('fs');
const pdfParse = require('pdf-parse');

function extractBlockAndQuestion(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);

  pdfParse(pdfBuffer).then(data => {
    const block = extractForGabarito(data.text);
    const questionLines = getGabaritoForPdf(block);

    console.log(questionLines);
  }).catch(error => {
    console.error('Erro ao processar o PDF:', error);
  });
}

function extractForGabarito(text) {
  const pattern = /\(\*\) Questão\(ões\) anulada\(s\) - a pontuação será revertida a todos os candidatos[\s\S]*?Imprimir/g;
  const match = text.match(pattern);

  return match ? match[0] : "Bloco não encontrado!";
}

function getGabaritoForPdf(block) {
  const lines = block.split("\n").filter(line => line.trim() !== "" && !line.includes("ttps://fundatec.org.br/portal/concursos/") && !line.includes("Fundatec") && !line.includes("Imprimir"));

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


extractBlockAndQuestion('./gabarito_2023.pdf');
