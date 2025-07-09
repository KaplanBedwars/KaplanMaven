const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const UPLOAD_ROOT = "D:/kaplanmaven"; // ← MAVEN KÖK DİZİNİ

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Geçici yükleme klasörü
const TEMP_UPLOAD = "temp_uploads";
if (!fs.existsSync(TEMP_UPLOAD)) fs.mkdirSync(TEMP_UPLOAD);

// Multer ayarı
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_UPLOAD);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Form POST işlemi
app.post('/upload', upload.single('jarfile'), (req, res) => {
  const { fullGroupId, pomGroupId, artifactId, version } = req.body;
  const tempFilePath = req.file.path;

  const groupFolder = fullGroupId.replace(/\./g, '/');
  const targetDir = path.join(UPLOAD_ROOT, groupFolder, artifactId, version);
  fs.mkdirSync(targetDir, { recursive: true });

  const jarFilename = `${artifactId}-${version}.jar`;
  const pomFilename = `${artifactId}-${version}.pom`;

  // Jar dosyasını taşı
  const finalJarPath = path.join(targetDir, jarFilename);
  fs.renameSync(tempFilePath, finalJarPath);

  // Pom dosyası oluştur
  const pomContent = `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${pomGroupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>${version}</version>
</project>`.trim();

  fs.writeFileSync(path.join(targetDir, pomFilename), pomContent, 'utf8');

  res.send(`
    <h2>✅ Başarıyla yüklendi!</h2>
    <p>Hedef klasör: ${targetDir}</p>
    <ul>
      <li>${jarFilename}</li>
      <li>${pomFilename}</li>
    </ul>
    <a href="/">↩️ Geri dön</a>
  `);
});

app.listen(port, () => {
  console.log(`Kaplan Maven Builder http://localhost:${port} üzerinde çalışıyor`);
});
