// test1.js
import { addNumbers } from './addition.js';

document.addEventListener('DOMContentLoaded', () => {
    const result = addNumbers(5, 3);
    console.log(`The result is: ${result}`);
    document.getElementById('result').innerText = `The result is: ${result}`;
});
