// tiny runner to require modules and catch syntax errors
try {
    require('../js/modules/stats-manager.js');
    console.log('require succeeded');
} catch (e) {
    console.error('require failed:', e && e.stack ? e.stack : e);
    process.exit(1);
}
