const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const UPLOAD_ROOT = "D:/kaplanmaven";
const TEMP_UPLOAD = "temp_uploads";

if (!fs.existsSync(TEMP_UPLOAD)) fs.mkdirSync(TEMP_UPLOAD);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
// Projelerin bulunduğu dizini public olarak sun
app.use('/', express.static(UPLOAD_ROOT));


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_UPLOAD),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
app.get('/api/list', (req, res) => {
  const projects = {};

  const walk = (dir, groupParts = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subFiles = fs.readdirSync(fullPath);
        const versions = subFiles.filter(f => fs.statSync(path.join(fullPath, f)).isDirectory());
        if (versions.length > 0 && versions.every(v => v.match(/^\d+\.\d+.*$/))) {
          const groupId = groupParts.join('.');
          const artifactId = file;
          const key = `${groupId}|${artifactId}`;
          if (!projects[key]) projects[key] = { groupId, artifactId, versions: [] };
          projects[key].versions.push(...versions);
        } else {
          walk(fullPath, [...groupParts, file]);
        }
      }
    }
  };

  walk(UPLOAD_ROOT);

  // Versiyonları sıralayıp diziye dönüştür
  const result = Object.values(projects).map(p => ({
    ...p,
    versions: p.versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }));

  res.json(result);
});


// 🚀 Yeni Proje Yükleme
app.post('/api/new-project', upload.single('jarfile'), (req, res) => {
  const { fullGroupId, pomGroupId, artifactId, version } = req.body;
  const tempFilePath = req.file.path;

  const groupFolder = fullGroupId.replace(/\./g, '/');
  const targetDir = path.join(UPLOAD_ROOT, groupFolder, artifactId, version);
  fs.mkdirSync(targetDir, { recursive: true });

  const jarFilename = `${artifactId}-${version}.jar`;
  const pomFilename = `${artifactId}-${version}.pom`;

  fs.renameSync(tempFilePath, path.join(targetDir, jarFilename));

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

  res.json({ success: true });
});

app.post('/api/add-version', upload.single('jarfile'), (req, res) => {
  const { projectSelect, version } = req.body;
  const tempFilePath = req.file.path;

  const [fullGroupId, artifactId] = projectSelect.split('|');
  const groupFolder = fullGroupId.replace(/\./g, '/');
  const targetDir = path.join(UPLOAD_ROOT, groupFolder, artifactId, version);
  fs.mkdirSync(targetDir, { recursive: true });

  const jarFilename = `${artifactId}-${version}.jar`;
  const pomFilename = `${artifactId}-${version}.pom`;

  fs.renameSync(tempFilePath, path.join(targetDir, jarFilename));

  const pomContent = `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${fullGroupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>${version}</version>
</project>`.trim();

  fs.writeFileSync(path.join(targetDir, pomFilename), pomContent, 'utf8');

  res.json({ success: true });
});


// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Kaplan Maven Builder http://localhost:${port} adresinde çalışıyor`);
});
