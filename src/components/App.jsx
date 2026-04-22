import { useState, useEffect } from 'react';
import '../styles/App.css';

function App() {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showScenario, setShowScenario] = useState(false);
  const [loadingTest, setLoadingTest] = useState(null); // Track which test is loading
  const [processingRequests, setProcessingRequests] = useState(0); // Track concurrent requests

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchTransactions(selectedDept.id);
    }
  }, [selectedDept]);

  const fetchDepartments = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/departments`);
      const data = await response.json();
      setDepartments(data);
      
      // Update selectedDept with fresh data if it exists
      if (selectedDept) {
        const updatedSelectedDept = data.find(d => d.id === selectedDept.id);
        if (updatedSelectedDept) {
          setSelectedDept(updatedSelectedDept);
        }
      } else if (data.length > 0) {
        setSelectedDept(data[0]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchTransactions = async (deptId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/departments/${deptId}/transactions`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const processPayment = async (amount, description, userName) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/departments/${selectedDept.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, userName })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✓ Payment successful! New balance: ₹${data.newBalance.toFixed(2)}`);
      } else {
        alert(`✗ Payment failed: ${data.error}`);
      }

      fetchDepartments();
      fetchTransactions(selectedDept.id);
    } catch (error) {
      alert('Payment processing error');
      console.error(error);
    }
  };

  const simulateConcurrentPayments = async (count, amount, testType) => {
    setLoadingTest(testType); // Set which test is loading
    setTestResults(null);
    setProcessingRequests(count); // Show how many requests are being processed
    
    // Fetch current balance first to ensure we have the latest value
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const deptResponseBefore = await fetch(`${apiUrl}/api/departments`);
    const deptsBefore = await deptResponseBefore.json();
    const currentDept = deptsBefore.find(d => d.id === selectedDept.id);
    const startBalance = parseFloat(currentDept.balance);
    
    const startTime = Date.now();
    
    // Simulate multiple users making payments simultaneously
    // For edge case (2 payments), use User1 and User2
    // For valid case (10 payments), distribute across User1, User2, User3
    const promises = Array.from({ length: count }, (_, i) => {
      let userNum;
      if (testType === 'edge') {
        // Edge case: Only User1 and User2
        userNum = (i % 2) + 1;
      } else {
        // Valid case: All 3 users
        userNum = (i % 3) + 1;
      }
      
      return fetch(`${apiUrl}/api/departments/${selectedDept.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: `Invoice #${Date.now()}-${i}`,
          userName: `User${userNum}`
        })
      }).then(r => r.json());
    });

    try {
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => r.error).length;
      
      await fetchDepartments();
      await fetchTransactions(selectedDept.id);
      
      // Get updated balance
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const deptResponse = await fetch(`${apiUrl}/api/departments`);
      const depts = await deptResponse.json();
      const updatedDept = depts.find(d => d.id === selectedDept.id);
      const endBalance = parseFloat(updatedDept.balance);
      
      // Calculate expected balance based on successful payments
      const expectedBalance = startBalance - (successful * amount);
      
      setTestResults({
        testType,
        startBalance,
        endBalance,
        successful,
        failed,
        totalRequests: count,
        amount,
        duration,
        expectedBalance
      });
      
    } catch (error) {
      alert('Concurrent test error');
      console.error(error);
    } finally {
      setLoadingTest(null); // Clear loading state
      setProcessingRequests(0); // Clear processing count
    }
  };

  const resetBalance = async (balance) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      await fetch(`${apiUrl}/api/departments/${selectedDept.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance })
      });
      setTestResults(null); // Clear test results when resetting
      fetchDepartments();
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  const clearTestResults = () => {
    setTestResults(null);
  };

  const clearTransactions = async () => {
    if (!window.confirm('Are you sure you want to clear all transactions for this department?')) {
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      await fetch(`${apiUrl}/api/departments/${selectedDept.id}/transactions`, {
        method: 'DELETE'
      });
      setTransactions([]);
      alert('✓ Transactions cleared successfully');
    } catch (error) {
      console.error('Clear transactions error:', error);
      alert('✗ Failed to clear transactions');
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>💼 Departmental Expense Wallet System</h1>
        <p>Concurrent Transaction Handling with Database-Level Locking</p>
        <button 
          className="scenario-toggle"
          onClick={() => setShowScenario(!showScenario)}
        >
          {showScenario ? '📖 Hide Scenario' : '📖 Show Scenario'}
        </button>
      </header>

      {showScenario && (
        <div className="scenario-box">
          <h2>🎯 Business Scenario</h2>
          <div className="scenario-content">
            <p className="scenario-intro">
              A mid-sized enterprise with <strong>4 business units (BUs)</strong>, each having a dedicated expense wallet (₹50,000 initial balance). 
              Each department has <strong>3 active users</strong> with administrative rights to pay vendor invoices. 
              At month-end, users are rapidly clearing multiple invoices simultaneously.
            </p>
            
            <div className="challenge-section">
              <h3>⚡ The Challenge</h3>
              <p>Handle simultaneous requests without data loss or double-spending using the same logic for both scenarios:</p>
            </div>
            
            <div className="test-cases-grid">
              <div className="test-case-card">
                <div className="test-case-badge success">Test Case 1</div>
                <h4>High-Volume Valid Case</h4>
                <div className="test-case-details">
                  <p><strong>Initial Balance:</strong> ₹50,000</p>
                  <p><strong>Action:</strong> 3 users submit 10 payment requests (₹500 each) at the exact same millisecond</p>
                  <p><strong>Expected Result:</strong> All 10 succeed → Final balance: ₹45,000</p>
                </div>
              </div>
              
              <div className="test-case-card">
                <div className="test-case-badge warning">Test Case 2</div>
                <h4>Edge Case (Insufficient Funds)</h4>
                <div className="test-case-details">
                  <p><strong>Initial Balance:</strong> ₹2,000</p>
                  <p><strong>Action:</strong> 2 users submit ₹1,500 payments at the exact same millisecond</p>
                  <p><strong>Expected Result:</strong> 1 succeeds, 1 fails → Final balance: ₹500 (never negative)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div className="tabs">
          {departments.map(dept => (
            <button
              key={dept.id}
              className={`tab ${selectedDept?.id === dept.id ? 'active' : ''}`}
              onClick={() => setSelectedDept(dept)}
            >
              <span className="dept-name">{dept.name}</span>
              <span className="balance">₹{parseFloat(dept.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </button>
          ))}
        </div>

        {selectedDept && (
          <div className="content">
            <div className="wallet-card">
              <h2>{selectedDept.name} Department</h2>
              
              <div className="users-info">
                <div className="user-badge">👤 User1</div>
                <div className="user-badge">👤 User2</div>
                <div className="user-badge">👤 User3</div>
                <span className="users-label">3 Active Users with Admin Rights</span>
              </div>

              <div className="balance-display">
                <span className="label">Current Wallet Balance</span>
                <span className="amount">₹{parseFloat(selectedDept.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {testResults && (
                <div className="test-results">
                  <div className="test-results-header">
                    <h3>📊 Test Results</h3>
                    <button onClick={clearTestResults} className="clear-results-btn" title="Clear test results">
                      ✕
                    </button>
                  </div>
                  <div className="results-grid">
                    <div className="result-item">
                      <span className="result-label">Test Type:</span>
                      <span className="result-value">{testResults.testType === 'valid' ? '✅ High-Volume Valid Case' : '⚠️ Edge Case'}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Total Requests:</span>
                      <span className="result-value">{testResults.totalRequests} × ₹{testResults.amount}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Starting Balance:</span>
                      <span className="result-value">₹{testResults.startBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Successful:</span>
                      <span className="result-value success">{testResults.successful} payments</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Failed:</span>
                      <span className="result-value failed">{testResults.failed} payments</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Final Balance:</span>
                      <span className="result-value">₹{testResults.endBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Expected Balance:</span>
                      <span className="result-value">₹{testResults.expectedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Processing Time:</span>
                      <span className="result-value">{testResults.duration}ms</span>
                    </div>
                    <div className={`result-status ${testResults.endBalance === testResults.expectedBalance ? 'pass' : 'fail'}`}>
                      {testResults.endBalance === testResults.expectedBalance ? '✅ TEST PASSED' : '❌ TEST FAILED'}
                    </div>
                  </div>
                </div>
              )}

              <div className="actions">
                <h3>🧪 Concurrent Payment Tests</h3>
                
                {processingRequests > 0 && (
                  <div className="processing-indicator">
                    <div className="processing-animation">
                      <span className="loading-spinner"></span>
                      <span className="processing-text">
                        Processing {processingRequests} concurrent requests simultaneously...
                      </span>
                    </div>
                    <div className="concurrent-requests">
                      {Array.from({ length: processingRequests }, (_, i) => (
                        <div key={i} className="request-dot" style={{ animationDelay: `${i * 0.1}s` }}>
                          💳
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="test-case">
                  <div className="test-header">
                    <span className="test-number">Test 1</span>
                    <span className="test-title">High-Volume Valid Case</span>
                  </div>
                  <p className="test-desc">10 concurrent payments of ₹500 each from ₹50,000 balance</p>
                  <button 
                    onClick={() => simulateConcurrentPayments(10, 500, 'valid')}
                    disabled={loadingTest !== null}
                    className="test-btn"
                  >
                    {loadingTest === 'valid' ? <><span className="loading-spinner"></span>Processing...</> : '▶ Run Test 1'}
                  </button>
                </div>

                <div className="test-case">
                  <div className="test-header">
                    <span className="test-number">Test 2</span>
                    <span className="test-title">Edge Case (Insufficient Funds)</span>
                  </div>
                  <p className="test-desc">2 concurrent ₹1,500 payments from ₹2,000 balance</p>
                  <div className="action-row">
                    <button onClick={() => resetBalance(2000)} className="reset-btn" disabled={loadingTest !== null}>
                      Set Balance to ₹2,000
                    </button>
                    <button 
                      onClick={() => simulateConcurrentPayments(2, 1500, 'edge')}
                      disabled={loadingTest !== null}
                      className="test-btn"
                    >
                      {loadingTest === 'edge' ? <><span className="loading-spinner"></span>Processing...</> : '▶ Run Test 2'}
                    </button>
                  </div>
                </div>

                <div className="divider"></div>

                <h3>💳 Single Payment</h3>
                <div className="action-row">
                  <button onClick={() => processPayment(500, 'Vendor Invoice', 'User1')} className="single-payment-btn">
                    User1: Pay ₹500
                  </button>
                  <button onClick={() => processPayment(1500, 'Vendor Invoice', 'User2')} className="single-payment-btn">
                    User2: Pay ₹1,500
                  </button>
                  <button onClick={() => processPayment(5000, 'Vendor Invoice', 'User3')} className="single-payment-btn">
                    User3: Pay ₹5,000
                  </button>
                </div>

                <div className="divider"></div>

                <h3>🔄 Reset Balance</h3>
                <div className="action-row">
                  <button onClick={() => { resetBalance(50000); clearTestResults(); }} className="reset-btn">
                    Reset to ₹50,000
                  </button>
                </div>
              </div>
            </div>

            <div className="transactions-card">
              <div className="transactions-header">
                <h3>📜 Transaction Ledger (Recent 50)</h3>
                <button 
                  onClick={clearTransactions} 
                  className="clear-transactions-btn"
                  title="Clear all transactions"
                >
                  🗑️ Clear Ledger
                </button>
              </div>
              <div className="ledger-stats">
                <div className="stat">
                  <span className="stat-value">{transactions.filter(t => t.status === 'SUCCESS').length}</span>
                  <span className="stat-label">Successful</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{transactions.filter(t => t.status === 'FAILED').length}</span>
                  <span className="stat-label">Failed</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{transactions.length}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
              <div className="transactions-list">
                {transactions.length === 0 ? (
                  <p className="no-data">No transactions yet. Run a test to see results!</p>
                ) : (
                  transactions.map(tx => (
                    <div key={tx.id} className={`transaction ${tx.status.toLowerCase()}`}>
                      <div className="tx-info">
                        <span className="tx-desc">{tx.description}</span>
                        <span className="tx-user">👤 {tx.user_name}</span>
                      </div>
                      <div className="tx-details">
                        <span className="tx-amount">₹{parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className={`tx-status ${tx.status.toLowerCase()}`}>
                          {tx.status === 'SUCCESS' ? '✓ SUCCESS' : '✗ FAILED'}
                        </span>
                      </div>
                      <div className="tx-time">{new Date(tx.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
