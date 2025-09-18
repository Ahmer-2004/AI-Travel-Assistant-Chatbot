const url = 'https://sky-scrapper.p.rapidapi.com/api/v1/checkServer';
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': 'e5c0805bbfmsh1cdce252418ab33p14bd81jsn453da6ab0de5',
		'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
	}
};

try {
	const response = await fetch(url, options);
	const result = await response.text();
	console.log(result);
} catch (error) {
	console.error(error);
}