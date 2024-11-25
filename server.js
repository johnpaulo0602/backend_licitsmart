const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Multer
const upload = multer({
    dest: 'uploads/', // Pasta onde os arquivos serão armazenados temporariamente
});

// Banco de dados SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criação da tabela
db.run(
    `CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        filepath TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
        if (err) {
            console.error('Erro ao criar tabela:', err.message);
        }
    }
);

// Endpoint de upload
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const filename = file.originalname;
    const filepath = path.join('uploads', file.filename);

    db.run(
        'INSERT INTO files (filename, filepath) VALUES (?, ?)',
        [filename, filepath],
        function (err) {
            if (err) {
                console.error('Erro ao salvar no banco de dados:', err.message);
                return res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
            }
            res.json({ success: `Arquivo "${filename}" enviado com sucesso.` });
        }
    );
});

// Endpoint para obter a lista de arquivos
app.get('/files', (req, res) => {
    db.all('SELECT id, filename FROM files', [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar arquivos:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar arquivos.' });
        }
        const files = rows.map((row) => row.filename);
        res.json({ files });
    });
});

// Endpoint para obter um arquivo específico
app.get('/files/:filename', (req, res) => {
    const { filename } = req.params;
    db.get('SELECT filepath FROM files WHERE filename = ?', [filename], (err, row) => {
        if (err || !row) {
            console.error('Arquivo não encontrado:', err?.message);
            return res.status(404).json({ error: 'Arquivo não encontrado.' });
        }
        res.download(row.filepath, filename);
    });
});

// Endpoint para excluir um arquivo
app.delete('/files/:filename', (req, res) => {
    const { filename } = req.params;

    // Buscar o caminho do arquivo no banco de dados
    db.get('SELECT filepath FROM files WHERE filename = ?', [filename], (err, row) => {
        if (err || !row) {
            console.error('Erro ao buscar o arquivo:', err?.message);
            return res.status(404).json({ error: 'Arquivo não encontrado.' });
        }

        const filepath = row.filepath;

        // Remover o arquivo do sistema de arquivos
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error('Erro ao excluir o arquivo:', err.message);
                return res.status(500).json({ error: 'Erro ao excluir o arquivo.' });
            }

            // Remover o registro do banco de dados
            db.run('DELETE FROM files WHERE filename = ?', [filename], (err) => {
                if (err) {
                    console.error('Erro ao excluir do banco de dados:', err.message);
                    return res.status(500).json({ error: 'Erro ao excluir do banco de dados.' });
                }

                res.json({ success: `Arquivo "${filename}" removido com sucesso.` });
            });
        });
    });
});


// Inicie o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
