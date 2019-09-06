const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js');
const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: '2019-07-12',
  iam_apikey: 'd9eTrKpHqAspTudG1Vn4OR6Nce4yBQcfx1I6tsuDFrD5',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api'
});
const Curriculo = require('../models/curriculo');
const Vaga = require('../models/vaga');

mongoose.connect('mongodb+srv://bayer:bayer@cluster0-mfkxs.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true});

mongoose.set('useFindAndModify', false);

const urlencodedParser = bodyParser.urlencoded( {extended: true} );

module.exports = function(app) {
    app.get('/submeterCurriculo', function(req, res) {
        Vaga.find({}).then(vagas => {
            res.render('submeterCurriculo', {vagas});
        });
    });

    app.post('/submeterCurriculo', urlencodedParser, function(req, res) {
        let curriculo = req.body;

        //console.log(curriculo);

        const analyzeParams = {
            'text': JSON.stringify(curriculo),
            'features': {
              'categories': {
                'limit': 3
              },
              'entities': {
                'model': '7bc8b756-bfb7-4c57-93e7-5c573d15fa56'
              }
            }
        };

        naturalLanguageUnderstanding.analyze(analyzeParams)
        .then(analysisResults => {
            console.log(JSON.stringify(analysisResults, null, 2));

            let pontuacao = 0;
            const entidades = [...analysisResults.entities];

            entidades.forEach(entidade => {
                if (entidade.type == "Relevancia") {
                    pontuacao++;
                }
            });

            curriculo.pontuacao = pontuacao;
        })
        .then(() => {
            Curriculo(curriculo).save(function(err) {
                if (err) console.log("error: ", err);
            });
            res.send("Seu currículo foi enviado com sucesso!");
        })
        .catch(err => {
            console.log('error:', err);
        });
    });

    app.get('/recrutador', function(req, res) {
        let curriculosArquivados = [], curriculosNaoArquivados = [];

        Curriculo.find({}).then(curriculos => {
            curriculos.forEach(curriculo => {
                if (curriculo.arquivado)
                    curriculosArquivados.push(curriculo)
                else
                    curriculosNaoArquivados.push(curriculo);
            });

            Vaga.find({}).then(vagas => {
                res.render('recrutador', {curriculosArquivados, curriculosNaoArquivados, vagas});
            });
        });
    });

    app.get('/curriculo/:id', function(req, res) {
        Curriculo.find({_id: req.params.id}, function(err, curriculo) {
            console.log("*--------------------*")
            console.log('-');
            console.log(JSON.stringify(curriculo));
            res.render('curriculo', {curriculo: curriculo});
        });
    })

    app.put('/curriculo/:id/arquivar', function(req, res) {
        Curriculo.findOneAndUpdate({_id: req.params.id}, {arquivado: true})
        .then(curriculo => {res.send(curriculo)});
    });

    app.put('/curriculo/:id/desarquivar', function(req, res) {
        Curriculo.findOneAndUpdate({_id: req.params.id}, {arquivado: false})
        .then(curriculo => {res.send(curriculo)});
    });

    app.delete('/curriculo/:id', function(req, res) {
        Curriculo.findByIdAndDelete({_id: req.params.id})
        .then(curriculo => {res.send(curriculo)});
    });

    app.post('/recrutador/inserirVaga/:vaga', function(req, res) {
        let vaga = {
            nome: req.params.vaga
        }

        Vaga(vaga).save(function(err) {
            if (err) throw err;
        });

        res.send("Vaga cadastrada com sucesso!");
    });

    app.delete('/recrutador/deletarVaga/:id', function(req, res) {
        Vaga.findByIdAndDelete({_id: req.params.id})
        .then(vaga => {res.send(vaga)});
    });
}