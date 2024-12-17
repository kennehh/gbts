// First, define both approaches
enum MessageType {
    Process = 0,
    Cancel = 1,
    Config = 2
  }
  
  const MSG_PROCESS = 0;
  const MSG_CANCEL = 1;
  const MSG_CONFIG = 2;
  
  // Create test data
  const ITERATIONS = 10_000_000;
  const testData: Array<{type: number}> = [];
  for (let i = 0; i < ITERATIONS; i++) {
    testData.push({ type: i % 3 });
  }
  
  // Benchmark functions
  function withEnum() {
    let count = 0;
    for (const msg of testData) {
      switch (msg.type) {
        case MessageType.Process:
          count++;
          break;
        case MessageType.Cancel:
          count++;
          break;
        case MessageType.Config:
          count++;
          break;
      }
    }
    return count;
  }
  
  function withNumbers() {
    let count = 0;
    for (const msg of testData) {
      switch (msg.type) {
        case MSG_PROCESS:
          count++;
          break;
        case MSG_CANCEL:
          count++;
          break;
        case MSG_CONFIG:
          count++;
          break;
      }
    }
    return count;
  }
  
  function withLiterals() {
    let count = 0;
    for (const msg of testData) {
      switch (msg.type) {
        case 0:
          count++;
          break;
        case 1:
          count++;
          break;
        case 2:
          count++;
          break;
      }
    }
    return count;
  }
  
  // Utility function for consistent timing
  function benchmark(fn: () => number, name: string) {
    // Warm up
    for (let i = 0; i < 3; i++) {
      fn();
    }
    
    // Actual timing
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      times.push(end - start);
    }
    
    // Remove outliers (min and max)
    times.sort((a, b) => a - b);
    times.pop();
    times.shift();
    
    // Calculate average
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`${name}: ${avg.toFixed(2)}ms`);
    return avg;
  }
  
  // Run benchmarks
  console.log(`Running ${ITERATIONS.toLocaleString()} iterations each...`);
  const enumTime = benchmark(withEnum, 'Enum');
  const constTime = benchmark(withNumbers, 'Const');
  const literalTime = benchmark(withLiterals, 'Literal');
  
  console.log('\nRelative Performance:');
  console.log(`Enum is ${((enumTime / literalTime - 1) * 100).toFixed(2)}% slower than literals`);
  console.log(`Const is ${((constTime / literalTime - 1) * 100).toFixed(2)}% slower than literals`);
  