// ======================== GLOBALS & CONSTANTS ========================

const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;
let window_db = {
  accounts: [],
  departments: [],
  employees: [],
  requests: []
};

// Alias for window object
window.db = window_db;

// ======================== INITIALIZATION ========================

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  handleRouting();
  attachEventListeners();

  // Set up hash change listener
  window.addEventListener('hashchange', handleRouting);

  // If no hash, set to home
  if (!window.location.hash) {
    window.location.hash = '#/';
  }
});

// ======================== STORAGE & PERSISTENCE ========================

function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      window_db = JSON.parse(stored);
      window.db = window_db;
    } catch (e) {
      console.error('Failed to parse stored data:', e);
      seedDatabase();
    }
  } else {
    seedDatabase();
  }

  // Check for existing auth token
  const token = localStorage.getItem('auth_token');
  if (token) {
    const account = window_db.accounts.find(a => a.email === token);
    if (account) {
      setAuthState(true, account);
    }
  }
}

function seedDatabase() {
  window_db = {
    accounts: [
      {
        id: 'user_1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'admin',
        verified: true
      },
      {
        id: 'user_2',
        firstName: 'John',
        lastName: 'Employee',
        email: 'john@example.com',
        password: 'Password123!',
        role: 'user',
        verified: true
      }
    ],
    departments: [
      {
        id: 'dept_1',
        name: 'Engineering',
        description: 'Software development team'
      },
      {
        id: 'dept_2',
        name: 'HR',
        description: 'Human resources department'
      }
    ],
    employees: [
      {
        id: 'emp_1',
        employeeId: 'EMP001',
        email: 'john@example.com',
        position: 'Software Engineer',
        departmentId: 'dept_1',
        hireDate: '2023-01-15'
      }
    ],
    requests: []
  };
  window.db = window_db;
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window_db));
}

// ======================== ROUTING ========================

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash.replace('#', '') || '/';
  const [route, ...params] = hash.split('/').filter(Boolean);

  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Route definitions
  const routes = {
    '': 'home-page',
    'home': 'home-page',
    'register': 'register-page',
    'verify-email': 'verify-email-page',
    'login': 'login-page',
    'profile': 'profile-page',
    'employees': 'employees-page',
    'departments': 'departments-page',
    'accounts': 'accounts-page',
    'requests': 'requests-page'
  };

  const pageId = routes[route];

  // Check authentication for protected routes
  const protectedRoutes = ['profile', 'employees', 'departments', 'accounts', 'requests'];
  const adminRoutes = ['employees', 'departments', 'accounts'];

  if (protectedRoutes.includes(route) && !currentUser) {
    navigateTo('#/login');
    showToast('Please login first', 'warning');
    return;
  }

  if (adminRoutes.includes(route) && currentUser && currentUser.role !== 'admin') {
    navigateTo('#/');
    showToast('You do not have permission to access this page', 'warning');
    return;
  }

  // Show the page
  if (pageId) {
    const page = document.getElementById(pageId);
    if (page) {
      page.classList.add('active');

      // Call page-specific renderers
      if (route === 'profile') {
        renderProfile();
      } else if (route === 'employees') {
        renderEmployeesTable();
      } else if (route === 'departments') {
        renderDepartmentsTable();
      } else if (route === 'accounts') {
        renderAccountsTable();
      } else if (route === 'requests') {
        renderRequestsTable();
      }
    }
  }
}

// ======================== AUTHENTICATION ========================

function setAuthState(isAuth, user = null) {
  currentUser = isAuth ? user : null;
  const body = document.body;

  if (isAuth) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');

    if (user && user.role === 'admin') {
      body.classList.add('is-admin');
    } else {
      body.classList.remove('is-admin');
    }

    // Update navbar username
    const navUsername = document.getElementById('navUsername');
    if (navUsername && user) {
      navUsername.textContent = `${user.firstName} ${user.lastName}`;
    }
  } else {
    body.classList.add('not-authenticated');
    body.classList.remove('authenticated');
    body.classList.remove('is-admin');
  }
}

function handleRegister(e) {
  e.preventDefault();

  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  // Validation
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'warning');
    return;
  }

  // Check if email already exists
  if (window_db.accounts.some(a => a.email === email)) {
    showToast('Email already registered', 'warning');
    return;
  }

  // Create new account (unverified)
  const newAccount = {
    id: `user_${Date.now()}`,
    firstName,
    lastName,
    email,
    password,
    role: 'user',
    verified: false
  };

  window_db.accounts.push(newAccount);
  saveToStorage();

  // Store email for verification
  localStorage.setItem('unverified_email', email);

  showToast('Account created! Verify your email.', 'success');
  document.getElementById('registerForm').reset();
  navigateTo('#/verify-email');
}

function simulateEmailVerification() {
  const email = localStorage.getItem('unverified_email');

  if (!email) {
    showToast('No email to verify', 'warning');
    return;
  }

  const account = window_db.accounts.find(a => a.email === email);
  if (account) {
    account.verified = true;
    saveToStorage();
    localStorage.removeItem('unverified_email');
    showToast('Email verified! You can now login.', 'success');
    navigateTo('#/login');
  }
}

function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const account = window_db.accounts.find(
    a => a.email === email && a.password === password && a.verified
  );

  if (!account) {
    showToast('Invalid email, password, or email not verified', 'warning');
    return;
  }

  // Save token and set auth state
  localStorage.setItem('auth_token', account.email);
  setAuthState(true, account);
  showToast(`Welcome, ${account.firstName}!`, 'success');
  document.getElementById('loginForm').reset();
  navigateTo('#/profile');
}

function handleLogout() {
  localStorage.removeItem('auth_token');
  setAuthState(false);
  showToast('Logged out successfully', 'info');
  navigateTo('#/');
}

// ======================== PROFILE PAGE ========================

function renderProfile() {
  if (!currentUser) return;

  document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'User';
}

// ======================== ACCOUNTS MANAGEMENT ========================

function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  tbody.innerHTML = '';

  window_db.accounts.forEach(account => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${account.firstName} ${account.lastName}</td>
      <td>${account.email}</td>
      <td><span class="badge badge-primary">${account.role}</span></td>
      <td>${account.verified ? '✓' : '✕'}</td>
      <td>
        <button class="btn btn-sm btn-primary me-2" onclick="editAccount('${account.id}')">Edit</button>
        <button class="btn btn-sm btn-warning me-2" onclick="resetPassword('${account.id}')">Reset PW</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAccount('${account.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function editAccount(accountId) {
  const account = window_db.accounts.find(a => a.id === accountId);
  if (!account) return;

  document.getElementById('accFirstName').value = account.firstName;
  document.getElementById('accLastName').value = account.lastName;
  document.getElementById('accEmail').value = account.email;
  document.getElementById('accPassword').value = account.password;
  document.getElementById('accRole').value = account.role;
  document.getElementById('accVerified').checked = account.verified;

  // Store current account ID for update
  document.getElementById('accountForm').dataset.accountId = accountId;

  const modal = new bootstrap.Modal(document.getElementById('accountModal'));
  modal.show();
}

function resetPassword(accountId) {
  const account = window_db.accounts.find(a => a.id === accountId);
  if (!account) return;

  const newPassword = prompt('Enter new password (min 6 chars):');
  if (!newPassword || newPassword.length < 6) {
    showToast('Invalid password', 'warning');
    return;
  }

  account.password = newPassword;
  saveToStorage();
  showToast('Password reset successfully', 'success');
}

function deleteAccount(accountId) {
  // Prevent self-deletion
  if (currentUser && currentUser.id === accountId) {
    showToast('You cannot delete your own account', 'warning');
    return;
  }

  if (!confirm('Are you sure you want to delete this account?')) {
    return;
  }

  const index = window_db.accounts.findIndex(a => a.id === accountId);
  if (index !== -1) {
    window_db.accounts.splice(index, 1);
    saveToStorage();
    renderAccountsTable();
    showToast('Account deleted', 'success');
  }
}

function handleAccountSubmit(e) {
  e.preventDefault();

  const firstName = document.getElementById('accFirstName').value.trim();
  const lastName = document.getElementById('accLastName').value.trim();
  const email = document.getElementById('accEmail').value.trim();
  const password = document.getElementById('accPassword').value;
  const role = document.getElementById('accRole').value;
  const verified = document.getElementById('accVerified').checked;

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'warning');
    return;
  }

  const accountId = document.getElementById('accountForm').dataset.accountId;

  if (accountId) {
    // Edit existing
    const account = window_db.accounts.find(a => a.id === accountId);
    if (account) {
      account.firstName = firstName;
      account.lastName = lastName;
      account.email = email;
      account.password = password;
      account.role = role;
      account.verified = verified;
    }
  } else {
    // Create new
    if (window_db.accounts.some(a => a.email === email)) {
      showToast('Email already exists', 'warning');
      return;
    }

    window_db.accounts.push({
      id: `user_${Date.now()}`,
      firstName,
      lastName,
      email,
      password,
      role,
      verified
    });
  }

  saveToStorage();
  showToast('Account saved successfully', 'success');
  document.getElementById('accountForm').reset();
  delete document.getElementById('accountForm').dataset.accountId;
  bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
  renderAccountsTable();
}

// ======================== DEPARTMENTS MANAGEMENT ========================

function renderDepartmentsTable() {
  const tbody = document.getElementById('departmentsTableBody');
  tbody.innerHTML = '';

  window_db.departments.forEach(dept => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${dept.name}</td>
      <td>${dept.description || '-'}</td>
      <td>
        <button class="btn btn-sm btn-primary me-2" onclick="editDepartment('${dept.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDepartment('${dept.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function editDepartment(deptId) {
  const dept = window_db.departments.find(d => d.id === deptId);
  if (!dept) return;

  document.getElementById('deptName').value = dept.name;
  document.getElementById('deptDesc').value = dept.description;
  document.getElementById('departmentForm').dataset.deptId = deptId;

  const modal = new bootstrap.Modal(document.getElementById('departmentModal'));
  modal.show();
}

function deleteDepartment(deptId) {
  if (!confirm('Are you sure? Employees in this dept will be affected.')) {
    return;
  }

  const index = window_db.departments.findIndex(d => d.id === deptId);
  if (index !== -1) {
    window_db.departments.splice(index, 1);
    saveToStorage();
    renderDepartmentsTable();
    updateDepartmentDropdowns();
    showToast('Department deleted', 'success');
  }
}

function handleDepartmentSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('deptName').value.trim();
  const description = document.getElementById('deptDesc').value.trim();
  const deptId = document.getElementById('departmentForm').dataset.deptId;

  if (!name) {
    showToast('Department name is required', 'warning');
    return;
  }

  if (deptId) {
    const dept = window_db.departments.find(d => d.id === deptId);
    if (dept) {
      dept.name = name;
      dept.description = description;
    }
  } else {
    window_db.departments.push({
      id: `dept_${Date.now()}`,
      name,
      description
    });
  }

  saveToStorage();
  showToast('Department saved successfully', 'success');
  document.getElementById('departmentForm').reset();
  delete document.getElementById('departmentForm').dataset.deptId;
  bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
  renderDepartmentsTable();
  updateDepartmentDropdowns();
}

function updateDepartmentDropdowns() {
  const select = document.getElementById('empDept');
  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Select Department --</option>';

  window_db.departments.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept.id;
    option.textContent = dept.name;
    select.appendChild(option);
  });

  select.value = currentValue;
}

// ======================== EMPLOYEES MANAGEMENT ========================

function renderEmployeesTable() {
  const tbody = document.getElementById('employeesTableBody');
  tbody.innerHTML = '';
  const noMsg = document.getElementById('noEmployeesMsg');

  if (window_db.employees.length === 0) {
    noMsg.style.display = 'block';
    return;
  }

  noMsg.style.display = 'none';

  window_db.employees.forEach(emp => {
    const account = window_db.accounts.find(a => a.email === emp.email);
    const dept = window_db.departments.find(d => d.id === emp.departmentId);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${emp.employeeId}</td>
      <td>${account ? `${account.firstName} ${account.lastName}` : emp.email}</td>
      <td>${emp.position}</td>
      <td>${dept ? dept.name : '-'}</td>
      <td>${emp.hireDate}</td>
      <td>
        <button class="btn btn-sm btn-primary me-2" onclick="editEmployee('${emp.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function editEmployee(empId) {
  const emp = window_db.employees.find(e => e.id === empId);
  if (!emp) return;

  document.getElementById('empId').value = emp.employeeId;
  document.getElementById('empEmail').value = emp.email;
  document.getElementById('empPosition').value = emp.position;
  document.getElementById('empDept').value = emp.departmentId;
  document.getElementById('empHireDate').value = emp.hireDate;
  document.getElementById('employeeForm').dataset.empId = empId;

  updateDepartmentDropdowns();
  const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
  modal.show();
}

function deleteEmployee(empId) {
  if (!confirm('Are you sure you want to delete this employee?')) {
    return;
  }

  const index = window_db.employees.findIndex(e => e.id === empId);
  if (index !== -1) {
    window_db.employees.splice(index, 1);
    saveToStorage();
    renderEmployeesTable();
    showToast('Employee deleted', 'success');
  }
}

function handleEmployeeSubmit(e) {
  e.preventDefault();

  const empId = document.getElementById('empId').value.trim();
  const email = document.getElementById('empEmail').value.trim();
  const position = document.getElementById('empPosition').value.trim();
  const deptId = document.getElementById('empDept').value;
  const hireDate = document.getElementById('empHireDate').value;

  // Validate
  if (!empId || !email || !position || !deptId || !hireDate) {
    showToast('All fields are required', 'warning');
    return;
  }

  // Check if user exists
  if (!window_db.accounts.find(a => a.email === email)) {
    showToast('User email does not exist', 'warning');
    return;
  }

  const editId = document.getElementById('employeeForm').dataset.empId;

  if (editId) {
    // Edit existing
    const emp = window_db.employees.find(e => e.id === editId);
    if (emp) {
      emp.employeeId = empId;
      emp.email = email;
      emp.position = position;
      emp.departmentId = deptId;
      emp.hireDate = hireDate;
    }
  } else {
    // Create new
    window_db.employees.push({
      id: `emp_${Date.now()}`,
      employeeId: empId,
      email,
      position,
      departmentId: deptId,
      hireDate
    });
  }

  saveToStorage();
  showToast('Employee saved successfully', 'success');
  document.getElementById('employeeForm').reset();
  delete document.getElementById('employeeForm').dataset.empId;
  bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
  renderEmployeesTable();
}

// ======================== REQUESTS MANAGEMENT ========================

function renderRequestsTable() {
  const tbody = document.getElementById('requestsTableBody');
  const noMsg = document.getElementById('noRequestsMsg');
  const table = document.getElementById('requestsTable');
  tbody.innerHTML = '';

  const userRequests = window_db.requests.filter(r => r.employeeEmail === currentUser.email);

  if (userRequests.length === 0) {
    noMsg.style.display = 'block';
    table.style.display = 'none';
    return;
  }

  noMsg.style.display = 'none';
  table.style.display = 'table';

  userRequests.forEach(req => {
    const itemList = req.items.map(i => `${i.name} (qty: ${i.qty})`).join(', ');
    const badgeClass = req.status === 'Pending' ? 'warning' : req.status === 'Approved' ? 'success' : 'danger';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${req.type}</td>
      <td>${itemList}</td>
      <td><span class="badge badge-${badgeClass}">${req.status}</span></td>
      <td>${new Date(req.date).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteRequest('${req.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function deleteRequest(reqId) {
  if (!confirm('Delete this request?')) {
    return;
  }

  const index = window_db.requests.findIndex(r => r.id === reqId);
  if (index !== -1) {
    window_db.requests.splice(index, 1);
    saveToStorage();
    renderRequestsTable();
    showToast('Request deleted', 'success');
  }
}

function addItemField() {
  const container = document.getElementById('itemsContainer');
  const newRow = document.createElement('div');
  newRow.className = 'item-row mb-2';
  newRow.innerHTML = `
    <div class="row g-2">
      <div class="col">
        <input type="text" class="form-control item-name" placeholder="Item name" required>
      </div>
      <div class="col-auto">
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
      </div>
      <div class="col-auto">
        <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">×</button>
      </div>
    </div>
  `;
  container.appendChild(newRow);
}

function removeItem(button) {
  button.closest('.item-row').remove();
}

function handleRequestSubmit(e) {
  e.preventDefault();

  const type = document.getElementById('reqType').value;
  const items = [];

  document.querySelectorAll('.item-row').forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;

    if (name) {
      items.push({ name, qty });
    }
  });

  if (items.length === 0) {
    showToast('Add at least one item', 'warning');
    return;
  }

  const request = {
    id: `req_${Date.now()}`,
    type,
    items,
    status: 'Pending',
    date: new Date().toISOString(),
    employeeEmail: currentUser.email
  };

  window_db.requests.push(request);
  saveToStorage();

  showToast('Request submitted successfully', 'success');
  document.getElementById('requestForm').reset();

  // Reset items container
  const container = document.getElementById('itemsContainer');
  container.innerHTML = `
    <div class="item-row mb-2">
      <div class="row g-2">
        <div class="col">
          <input type="text" class="form-control item-name" placeholder="Item name" required>
        </div>
        <div class="col-auto">
          <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
        </div>
        <div class="col-auto">
          <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">×</button>
        </div>
      </div>
    </div>
  `;

  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  navigateTo('#/requests');
}

// ======================== TOAST NOTIFICATIONS ========================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.animation = 'slideIn 0.3s ease-out';

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ======================== EVENT LISTENERS ========================

function attachEventListeners() {
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Account form
  const accountForm = document.getElementById('accountForm');
  if (accountForm) {
    accountForm.addEventListener('submit', handleAccountSubmit);
  }

  // Department form
  const departmentForm = document.getElementById('departmentForm');
  if (departmentForm) {
    departmentForm.addEventListener('submit', handleDepartmentSubmit);
  }

  // Employee form
  const employeeForm = document.getElementById('employeeForm');
  if (employeeForm) {
    employeeForm.addEventListener('submit', handleEmployeeSubmit);
  }

  // Request form
  const requestForm = document.getElementById('requestForm');
  if (requestForm) {
    requestForm.addEventListener('submit', handleRequestSubmit);
  }

  // Modal reset when closed
  document.getElementById('accountModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('accountForm').reset();
    delete document.getElementById('accountForm').dataset.accountId;
  });

  document.getElementById('departmentModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('departmentForm').reset();
    delete document.getElementById('departmentForm').dataset.deptId;
  });

  document.getElementById('employeeModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('employeeForm').reset();
    delete document.getElementById('employeeForm').dataset.empId;
    updateDepartmentDropdowns();
  });

  document.getElementById('requestModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('requestForm').reset();
    const container = document.getElementById('itemsContainer');
    container.innerHTML = `
      <div class="item-row mb-2">
        <div class="row g-2">
          <div class="col">
            <input type="text" class="form-control item-name" placeholder="Item name" required>
          </div>
          <div class="col-auto">
            <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
          </div>
          <div class="col-auto">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(this)">×</button>
          </div>
        </div>
      </div>
    `;
  });
}
