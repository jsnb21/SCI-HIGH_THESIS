// Test file for console log removal
function testFunction() {
    console.log('This should be removed');
    const x = 5;
    console.log('Another log to remove');
    
    if (x > 0) {
        console.log('Nested log');
        return x * 2;
    }
    
    console.log('Final log'); // with comment
    return 0;
}

// Another function
function anotherFunction() {
    console.log("Different quotes");
    const result = calculate(); console.log("Inline log");
    return result;
}

// Function with template literal
function templateTest() {
    console.log(`Template literal ${variable}`);
    const data = getData();
    console.log(
        'Multi-line',
        'console log',
        data
    );
    return data;
}