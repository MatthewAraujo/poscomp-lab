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

  pdfParse(pdfBuffer).then(function (data) {
    // Extrair o texto bruto do PDF
    const text = data.text;

    // Extrair o bloco de texto entre os marcadores específicos
    const block = extractForGabarito(text);

    // Filtrar as linhas que possuem a estrutura "Questão RespostasComponente 1"
    const questionLines = getGabaritoForPdf(block);

    // Exibir as linhas filtradas
    console.log(questionLines);
  }).catch(function (error) {
    console.error('Erro ao processar o PDF:', error);
  });
}

function extractForGabarito(text) {
  // Regex para capturar o texto entre "(*) Questão(ões) anulada(s)" e "Imprimir"
  const pattern = /\(\*\) Questão\(ões\) anulada\(s\) - a pontuação será revertida a todos os candidatos[\s\S]*?Imprimir/g;

  const match = text.match(pattern);

  // Verificar se encontramos o bloco correspondente
  if (match) {
    return match[0]; // Retorna o primeiro bloco encontrado
  } else {
    return "Bloco não encontrado!";
  }
}

function getGabaritoForPdf(block) {
  const lines = block.split("\n");
  const questionLines = [];

  let questionNumber = 0;
  let questionAnswer = '';
  let questionCategory = '';

  lines.forEach((line, index) => {
    if (line.trim() === "") return;
    if (line.trim().includes("ttps://fundatec.org.br/portal/concursos/")) return;
    if (line.trim().includes("Fundatec")) return;
    if (line.trim().includes("Imprimir")) return;

    if (line.trim().match(/^\d+$/)) {
      if (questionNumber !== 0) {
        questionLines.push({
          question: questionNumber,
          questionAnswer,
          questionCategory
        });
      }
      questionNumber = parseInt(line.trim());
    } else {
      console.log(line)
      questionAnswer = line.split("")[0].trim();
      questionCategory = line.slice(1).trim();
    }
  });

  // Adiciona a última questão
  if (questionNumber !== 0) {
    questionLines.push({
      question: questionNumber,
      questionAnswer,
      questionCategory
    });
  }

  return questionLines;
}


extractBlockAndQuestion('./gabarito_2023.pdf');
