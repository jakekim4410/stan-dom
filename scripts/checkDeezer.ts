async function checkDeezerTopTracks() {
  const artistId = '153042292'; // IVE (K-pop)
  const res = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=3`);
  const data = await res.json();
  console.log(JSON.stringify(data.data[0], null, 2));
}

checkDeezerTopTracks();
