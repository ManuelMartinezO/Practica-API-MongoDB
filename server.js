// API REST de Juegos con MongoDB
// Instalación: npm install express mongoose multer cors dotenv
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT;
const HOST_DB = process.env.HOST_DB;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static('uploads'));

// Crear directorio uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB límite
});

// Conexión a MongoDB
mongoose.connect(HOST_DB, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
})
.then(() => console.log('✓ Conectado a MongoDB'))
.catch(err => console.error('Error conectando a MongoDB:', err));

// Schema de Juego
const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  genre: String,
  developer: String,
  releaseDate: Date,
  fileName: String,
  filePath: String,
  fileSize: Number,
  uploadedAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', gameSchema);

// RUTAS

// GET - Obtener todos los juegos
app.get('/api/games', async (req, res) => {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un juego por ID
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Subir un nuevo juego
app.post('/api/games/upload', upload.single('gameFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const { title, description, genre, developer, releaseDate } = req.body;

    const newGame = new Game({
      title,
      description,
      genre,
      developer,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size
    });

    await newGame.save();
    res.status(201).json({
      message: 'Juego subido exitosamente',
      game: newGame
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Descargar un juego
app.get('/api/games/:id/download', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const filePath = path.resolve(game.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.download(filePath, game.fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar información del juego
app.put('/api/games/:id', async (req, res) => {
  try {
    const { title, description, genre, developer, releaseDate } = req.body;
    const game = await Game.findByIdAndUpdate(
      req.params.id,
      { title, description, genre, developer, releaseDate },
      { new: true }
    );

    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    res.json({
      message: 'Juego actualizado exitosamente',
      game
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar un juego
app.delete('/api/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // Eliminar archivo físico
    if (fs.existsSync(game.filePath)) {
      fs.unlinkSync(game.filePath);
    }

    await Game.findByIdAndDelete(req.params.id);
    res.json({ message: 'Juego eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor MongoDB corriendo en http://localhost:${PORT}`);
});