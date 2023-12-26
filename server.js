// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const app = express();

// app.use(express.static('public')); // Serve static files from 'public' directory
// app.use(express.json({ limit: '50mb' })); // for parsing application/json

// // Endpoint to handle image upload
// app.post('/upload', (req, res) => {
//     const imageData = req.body.imageData;
//     const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
//     const filename = 'image_' + Date.now() + '.png';

//     fs.writeFile(path.join(__dirname, 'uploads', filename), base64Data, 'base64', (err) => {
//         if (err) {
//             console.error(err);
//             return res.sendStatus(500); // Internal Server Error
//         }
//         res.json({ imageUrl: '/uploads/' + filename });
//     });
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });
