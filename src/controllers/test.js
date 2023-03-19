import axios from 'axios';

const getTranslations = async (text, languages) => {
  try {
    const data = JSON.stringify({
      text: text,
      dest_languages: languages.join(','),
    });

    const config = {
      method: 'get',
      url: 'https://nlp-production.up.railway.app/translate',
      headers: { 'Content-Type': 'application/json' },
      data: data,
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    return {};
  }
};



try {
	const output = await getTranslations('my name is uday', ['hi']);
	console.log(output);
	if (Object.entries(output).length === 0)
	throw new Error('Translation Failed for title');
} catch (error) {
	console.log(error.message)
}



