const accessToken = '-6FuZmL5yUVgXnOCik_7D8s8QLRsXbgppp18GsJMadU'; // Replace with your access token
const channelSlug = 'your-channel-slug'; // Replace with your channel's slug
const imageUrl = 'http://example.com/image.jpg'; // URL of the image you want to upload

fetch(`http://api.are.na/v2/channels/${channelSlug}/blocks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source: imageUrl
  })
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
})
.catch((error) => {
  console.error('Error:', error);
});
