import geminiService from './src/modules/services/geminiService.js';

console.log('Gemini Service imported successfully');
console.log('Is available:', geminiService.isAvailable());

(async () => {
    try {
        console.log('Testing ensureInitialized...');
        const init = await geminiService.ensureInitialized();
        console.log('Initialized:', init);
    } catch (e) {
        console.error('Error:', e);
    }
})();
