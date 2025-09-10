import fs from 'fs'
import path from 'path'

const hyph_path = path.join(process.cwd(), 'public', 'hyph_pt_BR.dic')
const rawPatterns = fs.readFileSync(hyph_path, 'utf-8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.length > 0 && !line.match("UTF-8") && !line.match("4'4"));

export function hifenizador(word: string, rawPatterns: string[]) {

  let getWord = false;
  let finalWord: string[] = [];

  const p = word //períodos
    .trim()
    .replace(/^\.|\.$/g, '')
    .split(/([.:,;—–])/g); // mantém os separadores
  // console.log(p);

  for (let i = 0; i < p.length; i++) {

    if (/^[.:,;—–]$/.test(p[i].trim())) {
      finalWord.push(p[i].trim());
      continue;
    }

    const w = p[i]
      .trim()
      .split(/\s+/g);
    // console.log(w);

    for (let i = 0; i < w.length; i++) {

      const currentWord = w[i];
      const w1 = "." + currentWord + ".";
      const matches: { pattern: string; start: number; end: number; rawPattern: string }[] = [];
      const array: (string | null)[] = [];

      // cria array de letras intercaladas com null
      for (let i = 0; i < w1.length; i++) {
        array.push(w1[i]);
        if (i < w1.length - 1) array.push(null);
      }

      // encontra matches e ajusta start/end para a posição do array
      for (let size = 1; size <= w1.length; size++) {
        for (let start = 0; start <= w1.length - size; start++) {
          const segment = w1.slice(start, start + size);
          rawPatterns.forEach(p => {
            if (p?.replace(/\d+/g, '') === segment) {
              matches.push({
                pattern: segment,
                start: start * 2,
                end: (start + size - 1) * 2,
                rawPattern: p
              });
            }
          });
        }
      }

      // cria a matriz: primeira linha = array, linhas seguintes = matches
      const rows = matches.length + 1;
      const cols = array.length;
      const matrix: (string | null)[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null)
      );

      // primeira linha recebe array
      matrix[0] = [...array];

      // cada match preenche sua própria linha
      matches.forEach((match, idx) => {

        const chars = match.rawPattern.split('');
        let position: number;

        // ajusta posição inicial do pattern
        if (/^\d$/.test(chars[0])) {
          position = Math.max(0, match.start - 1);
        } else if (chars[0] === '.') {
          position = match.start + 1;
        } else {
          position = match.start;
        }

        for (let i = 0; i < chars.length; i++) {

          const c = chars[i];
          const next = chars[i + 1];

          // preenche a matriz com o caractere atual (idx é o índice do match)
          if (position < matrix[idx + 1].length) {
            matrix[idx + 1][position] = c;
            position++;
          }

          // insere valor coringa entre letras consecutivas
          if (
            i < chars.length - 1 &&
            /^[\p{L}]$/u.test(c) &&
            /^[\p{L}]$/u.test(next)
          ) {
            if (position < matrix[idx + 1].length) {
              matrix[idx + 1][position] = '?';
              position++;
            }
          }
        }
      });

      let allEqual = true;

      for (let col = 0; col < matrix[0].length; col++) {
        for (let row = 0; row < matrix.length; row++) {
          const val = matrix[row][col];
          const firstValue = matrix[0][col];
          if (val !== null && /^[\p{L}]$/u.test(val)) {
            if (firstValue !== val) {
              allEqual = false;
              break;
            }
          }
        }
      }

      let reconstructed = currentWord;

      if (!allEqual) {
        getWord = true;
        finalWord.push(currentWord);
      } else {
        const maxRow: number[] = Array(cols).fill(Number.NEGATIVE_INFINITY);

        for (let col = 0; col < cols; col++) {
          for (let row = 0; row < matrix.length; row++) {
            const val = matrix[row][col];
            if (val !== null && /^\d$/.test(val)) {
              maxRow[col] = Math.max(maxRow[col], Number(val));
            }
          }
        }

        matrix.push(maxRow.map((v, col) =>
          v === Number.NEGATIVE_INFINITY ? matrix[0][col] : v.toString()));

        const lastRow = matrix[matrix.length - 1];

        reconstructed = "/" + lastRow
          .map(v => {
            if (/^\d$/.test(v) && Number(v) % 2 === 1) return '/';
            if (v === '.' || /^\d$/.test(v)) return '';
            return v;
          })
          .join('')
          .replace(/^\/|\/$/g, '') + "/"
          // .replace(/\/{2,}/g, '/')
          // .trim();    
      }

      finalWord.push(reconstructed);
    }
  }

  const result = finalWord
    .join(' ')
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ \./g, ".")
    .replace(/^\/|\/$/g, '')
    .replace(/\/\s+\//g, (match, offset, full) => {

      function X(str1: string, str2: string, PV: { [key: string]: boolean }): boolean {

        for (const [par, isAtivo] of Object.entries(PV)) {
          if (!isAtivo) continue;
          if (
            str1.toLowerCase().endsWith(par[0]) &&
            str2.toLowerCase().startsWith(par[1])
          ) {
            return true;
          }
        }
        return false;
      }


      //REGRA 1 – DITONGOS
      //pares de vogais que são de difícil absorção do 1º pelo 2º: oa, ai, ie
      const PV = {
        aa: true, ae: true, ai: false, ao: true, au: true,
        ea: true, ee: true, ei: true, eo: true, eu: true,
        ia: true, ie: false, ii: true, io: true, iu: true,
        oa: false, oe: true, oi: true, oo: true, ou: true,
        ua: true, ue: true, ui: true, uo: true, uu: true
      }
      if (X(full.slice(0, offset), full.slice(offset + match.length).trimStart(), PV)) {
        return " ";
      }

      return match;
    })
    .replace(/\/\s\//g, "/ ")

  console.log("Frase hifenizada:", result);
  const unidades = (result.match(/\//g) || []).length;
  console.log("Quantidade de unidades:", unidades);

  // Encontra todas as posições dos "/"
  const indices = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '/') {
      indices.push(i);
    }
  }

  // Verifica se há pelo menos 6 barras
  if (indices.length >= 6) {
    const sextaBarraIndex = indices[5]; // índice do 6º "/"

    const parte1 = result.slice(0, sextaBarraIndex);
    const parte2 = result.slice(sextaBarraIndex);

    console.log("Parte 1:", parte1);
    console.log("Parte 2:", parte2);
  } else {
    console.log("Menos de 6 unidades. Não é possível dividir.");
  }



  return { getWord: getWord, word: result };
}

// Exemplo
hifenizador("tu e eu", rawPatterns);
