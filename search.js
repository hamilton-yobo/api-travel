const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const qs = require('qs');
//const fs = require('fs/promises');
const puppeteer = require('puppeteer-core');

// Params de busca
// const codigoOrigem = 21820;
// const codigoDestino = 228;
// const dia = 27;
// const mes = 11;
// const ano = 2025;

// URLs
const BASE = "https://www.webrodoviaria.com.br/VendaWebMacon";
const BUSCA = BASE + "/busca";
const CONSULTA_IDA_JSON = BASE + "/consulta/idaJson/0";

// Formata data DD/MM/AAAA
const formatData = (d, m, a) => {
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${dd}/${mm}/${a}`;
};

// Configuração do Cliente HTTP com suporte a Cookies (equivalente a requests.Session)
const jar = new CookieJar();
const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
}));

async function runPuppeteerFallback() {
    console.log("Tentando fallback com Puppeteer (equivalente ao Selenium)...");
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-gpu']
        });
        const page = await browser.newPage();

        // Monta a URL com Query String igual ao Python
        const dataFormatada = formatData(dia, mes, ano);
        const queryUrl = `${BUSCA}?origem=&origemCodigo=${codigoOrigem}&destino=&destinoCodigo=${codigoDestino}&dataInicial=${encodeURIComponent(dataFormatada)}`;

        await page.goto(queryUrl, { waitUntil: 'networkidle2' });

        // Espera pelo elemento de serviços (div-services) ou timeout
        try {
            await page.waitForSelector('#div-services', { timeout: 15000 });
        } catch (e) {
            console.log("Elemento #div-services não encontrado no tempo limite.");
        }

        // Tenta extrair dados do HTML renderizado
        const viagens = await page.evaluate(() => {
            // Exemplo simples de extração baseada em classes (ajuste conforme o site real)
            const cards = document.querySelectorAll('.card-servico'); // Exemplo de seletor
            const results = [];
            
            // Tenta pegar preços se existirem elementos .txt-valor (como no Python)
            const precos = document.querySelectorAll('.txt-valor');
            precos.forEach(p => results.push({ preco: p.innerText.trim() }));
            
            return results;
        });

        if (viagens.length > 0) {
            console.log('Dados encontrados via Puppeteer:', viagens);
        } else {
            console.log('Nenhum dado estruturado encontrado via Puppeteer, mas a página carregou.');
        }
        return viagens;

    } catch (error) {
        console.error("Erro no Puppeteer:", error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function main(codigoOrigem, codigoDestino, dia, mes, ano) {
    const dados = [];
    const dataFormatada = formatData(dia, mes, ano);

    try {
        // 1) GET /busca para setar cookies iniciais
        console.log("Acessando página de busca...");
        await client.get(BUSCA);
        console.log("Cookies obtidos.");

        // 2) POST form data
        // Em Node/Axios, precisamos usar 'qs' para stringify o body como x-www-form-urlencoded
        const dadosForm = {
            'origem': '',
            'origemCodigo': String(codigoOrigem),
            'destino': '',
            'destinoCodigo': String(codigoDestino),
            'dataInicial': dataFormatada,
            'dataFinal': '',
        };

        await client.post(BUSCA, qs.stringify(dadosForm), {
            headers: { 
                'Referer': BUSCA,
                'Content-Type': 'application/x-www-form-urlencoded' 
            }
        });
        console.log("Busca enviada com sucesso.");

        // 3) Chamada Ajax
        const ajaxResponse = await client.post(CONSULTA_IDA_JSON, {}, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': BUSCA
            }
        });

        const data = ajaxResponse.data;

        // Verificação de chaves recebidas
        if (typeof data === 'object') {
            console.log("Chaves recebidas no JSON:", Object.keys(data));
        }

        // Tenta localizar a lista de viagens
        const listaViagens = data.lsConsultaIda || data.lsConsulta || data.lsConsultaIda;

        if (!listaViagens || listaViagens.length === 0) {
            console.log("Nenhuma viagem encontrada no JSON.");
            // Chama fallback
            return await runPuppeteerFallback();
        }

        // Processamento dos dados
        listaViagens.forEach((v, i) => {
            const preco = v.preco || v.valor || '0.00';
            const servico = v.servico;
            const saida = v.saida?.hora || v.saida;
            const chegada = v.chegada?.hora || v.chegada;
            const assentos = v.assentosLivres !== undefined ? v.assentosLivres : v.assentos;
            const localSaida = v.localSaidaLocalidade || v.localSaida;
            const localChegada = v.localChegadaLocalidade || v.localChegada;

            // console.log(`#${i + 1} - Serviço:${servico} - ${localSaida} ${saida} -> ${localChegada} ${chegada} - Preço: ${preco} - Assentos:${assentos}`);

            dados.push({
                servico,
                localSaida,
                saida,
                localChegada,
                chegada,
                preco,
                assentos
            });
        });

        // Salvar em arquivo
        // await fs.writeFile('dados.json', JSON.stringify(dados, null, 4), 'utf-8');
        // console.log("Arquivo dados.json salvo com sucesso.");

        return dados;

    } catch (error) {
        console.error("Erro na requisição HTTP:", error.message);
        // Em caso de erro grave na requisição, tenta o fallback
        return await runPuppeteerFallback();
    }
}

module.exports = { main };