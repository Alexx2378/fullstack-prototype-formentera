/* ============================================================
   FULL-STACK WEB APP — script.js
   Complete SPA with Auth, CRUD, Routing & localStorage
   ============================================================ */

// ============================================
// GLOBAL VARIABLES
// ============================================

let currentUser = null;
const STORAGE_KEY = 'ipt_demo_v1';

// Backend base URL and auth header helper
const API_BASE = 'http://localhost:3000';
function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Normalize API user into the shape the UI expects
function normalizeUser(apiUser) {
    if (!apiUser) return null;
    return {
        firstName: apiUser.username || apiUser.email || 'User',
        lastName: apiUser.lastName || '',
        email: apiUser.username || apiUser.email || 'user@example.com',
        role: apiUser.role || 'user'
    };
}

// In-memory database (synced with localStorage)
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// ============================================
// PHASE 4: DATA PERSISTENCE WITH localStorage
// ============================================

function loadFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            window.db = JSON.parse(stored);
            console.log('✅ Data loaded from localStorage');
        } else {
            console.log('⚠️ No stored data — seeding database');
            seedDatabase();
        }
    } catch (error) {
        console.error('❌ Corrupt storage — reseeding', error);
        seedDatabase();
    }
}

function seedDatabase() {
    window.db = {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'admin',
                verified: true,
                createdAt: new Date().toISOString()
            }
        ],
        departments: [
            { id: 1, name: 'Engineering', description: 'Software team' },
            { id: 2, name: 'HR', description: 'Human Resources' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
        console.log('💾 Data saved');
    } catch (error) {
        console.error('❌ Save failed', error);
    }
}

// Load data immediately
loadFromStorage();

// ============================================
// PHASE 8: TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const bgMap = { success: 'bg-success', error: 'bg-danger', warning: 'bg-warning', info: 'bg-info' };
    const bgClass = bgMap[type] || 'bg-info';
    const textClass = type === 'warning' ? 'text-dark' : 'text-white';
    const toastId = 'toast-' + Date.now();

    container.insertAdjacentHTML('beforeend', `
        <div id="${toastId}" class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);

    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ============================================
// PHASE 2: CLIENT-SIDE ROUTING
// ============================================

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const pageName = hash.substring(2) || 'home';

    // --- Protected routes (must be logged in) ---
    const protectedRoutes = ['profile', 'requests'];
    if (protectedRoutes.includes(pageName) && !currentUser) {
        navigateTo('#/login');
        return;
    }

    // --- Admin-only routes ---
    const adminRoutes = ['employees', 'accounts', 'departments'];
    if (adminRoutes.includes(pageName)) {
        if (!currentUser) { navigateTo('#/login'); return; }
        if (currentUser.role !== 'admin') {
            showToast('Access denied. Admin privileges required.', 'error');
            navigateTo('#/');
            return;
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show the target page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');

        // Page-specific rendering
        if (pageName === 'profile')      renderProfile();
        if (pageName === 'accounts')     renderAccountsList();
        if (pageName === 'departments')  renderDepartmentsList();
        if (pageName === 'employees')    renderEmployeesList();
        if (pageName === 'requests')     renderRequests();
        if (pageName === 'verify-email') {
            const email = localStorage.getItem('unverified_email') || '';
            const el = document.getElementById('verify-email-display');
            if (el) el.textContent = email;
        }
    } else {
        navigateTo('#/');
    }
}

window.addEventListener('hashchange', handleRouting);

// ============================================
// PHASE 3-D: AUTH STATE MANAGEMENT
// ============================================

function setAuthState(isAuth, user = null) {
    const body = document.body;

    if (isAuth && user) {
        currentUser = user;
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');

        // Show user name in dropdown toggle
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.textContent = user.firstName;

        if (user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        currentUser = null;
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
    }
}

// ============================================
// PHASE 5: PROFILE PAGE
// ============================================

function renderProfile() {
    if (!currentUser) return;
    const el = document.getElementById('profile-content');
    if (!el) return;

    el.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">${currentUser.firstName} ${currentUser.lastName}</h5>
                <p class="card-text">
                    <strong>Email:</strong> ${currentUser.email}<br>
                    <strong>Role:</strong> ${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </p>
                <button class="btn btn-outline-dark btn-sm" onclick="editProfile()">Edit Profile</button>
            </div>
        </div>
    `;
}

function editProfile() {
    showToast('Edit profile feature coming soon!', 'info');
}

// ============================================
// PHASE 6-A: ACCOUNTS MANAGEMENT (Admin CRUD)
// ============================================

function renderAccountsList() {
    const container = document.getElementById('accounts-table-container');
    if (!container) return;

    let html = `
        <div class="card">
            <div class="card-body">
                <table class="table table-striped mb-0">
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Actions</th></tr>
                    </thead>
                    <tbody>`;

    if (window.db.accounts.length === 0) {
        html += `<tr><td colspan="5" class="text-center text-muted">No accounts.</td></tr>`;
    } else {
        window.db.accounts.forEach(a => {
            html += `
                <tr>
                    <td>${a.firstName} ${a.lastName}</td>
                    <td>${a.email}</td>
                    <td><span class="badge bg-${a.role === 'admin' ? 'danger' : 'primary'}">${a.role}</span></td>
                    <td>${a.verified ? '✅' : '❌'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editAccount(${a.id})">Edit</button>
                        <button class="btn btn-sm btn-outline-warning ms-1" onclick="resetPassword(${a.id})">Reset Password</button>
                        <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteAccount(${a.id})">Delete</button>
                    </td>
                </tr>`;
        });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

function showAccountForm(accountId = null) {
    const card = document.getElementById('account-form-card');
    const title = document.getElementById('account-form-title');
    card.style.display = 'block';

    document.getElementById('acct-edit-id').value = '';
    document.getElementById('acct-firstname').value = '';
    document.getElementById('acct-lastname').value = '';
    document.getElementById('acct-email').value = '';
    document.getElementById('acct-password').value = '';
    document.getElementById('acct-role').value = 'user';
    document.getElementById('acct-verified').checked = false;
    document.getElementById('acct-password').required = true;

    if (accountId) {
        const acct = window.db.accounts.find(a => a.id === accountId);
        if (!acct) return;
        title.textContent = 'Edit Account';
        document.getElementById('acct-edit-id').value = acct.id;
        document.getElementById('acct-firstname').value = acct.firstName;
        document.getElementById('acct-lastname').value = acct.lastName;
        document.getElementById('acct-email').value = acct.email;
        document.getElementById('acct-role').value = acct.role;
        document.getElementById('acct-verified').checked = acct.verified;
        document.getElementById('acct-password').required = false; // optional on edit
    } else {
        title.textContent = 'Add Account';
    }

    card.scrollIntoView({ behavior: 'smooth' });
}

function hideAccountForm() {
    document.getElementById('account-form-card').style.display = 'none';
    document.getElementById('account-form').reset();
}

function handleAccountSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('acct-edit-id').value;
    const firstName = document.getElementById('acct-firstname').value.trim();
    const lastName = document.getElementById('acct-lastname').value.trim();
    const email = document.getElementById('acct-email').value.trim().toLowerCase();
    const password = document.getElementById('acct-password').value;
    const role = document.getElementById('acct-role').value;
    const verified = document.getElementById('acct-verified').checked;

    if (editId) {
        // Update existing
        const acct = window.db.accounts.find(a => a.id === parseInt(editId));
        if (!acct) return;
        acct.firstName = firstName;
        acct.lastName = lastName;
        acct.email = email;
        if (password) acct.password = password;
        acct.role = role;
        acct.verified = verified;
        showToast('Account updated!', 'success');
    } else {
        // Create new
        if (!password || password.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (window.db.accounts.find(a => a.email === email)) {
            showToast('Email already exists!', 'error');
            return;
        }
        window.db.accounts.push({
            id: Date.now(),
            firstName, lastName, email, password, role, verified,
            createdAt: new Date().toISOString()
        });
        showToast('Account created!', 'success');
    }

    saveToStorage();
    hideAccountForm();
    renderAccountsList();
}

function editAccount(id) { showAccountForm(id); }

function resetPassword(id) {
    const acct = window.db.accounts.find(a => a.id === id);
    if (!acct) return;
    const pw = prompt(`Reset password for ${acct.email}\n\nEnter new password (min 6 chars):`);
    if (!pw) return;
    if (pw.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    acct.password = pw;
    saveToStorage();
    showToast('Password reset successfully!', 'success');
}

function deleteAccount(id) {
    if (currentUser && currentUser.id === id) {
        showToast('You cannot delete your own account!', 'error');
        return;
    }
    const acct = window.db.accounts.find(a => a.id === id);
    if (!acct) return;
    if (!confirm(`Delete account for ${acct.email}?`)) return;
    window.db.accounts = window.db.accounts.filter(a => a.id !== id);
    saveToStorage();
    renderAccountsList();
    showToast('Account deleted.', 'success');
}

// ============================================
// PHASE 6-B: DEPARTMENTS MANAGEMENT
// ============================================

function renderDepartmentsList() {
    const container = document.getElementById('departments-table-container');
    if (!container) return;

    let html = `
        <div class="card">
            <div class="card-body">
                <table class="table table-striped mb-0">
                    <thead>
                        <tr><th>Name</th><th>Description</th><th>Actions</th></tr>
                    </thead>
                    <tbody>`;

    if (window.db.departments.length === 0) {
        html += `<tr><td colspan="3" class="text-center text-muted">No departments.</td></tr>`;
    } else {
        window.db.departments.forEach(d => {
            html += `
                <tr>
                    <td>${d.name}</td>
                    <td>${d.description}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editDepartment(${d.id})">Edit</button>
                        <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteDepartment(${d.id})">Delete</button>
                    </td>
                </tr>`;
        });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

function showDepartmentForm(deptId = null) {
    const card = document.getElementById('department-form-card');
    const title = document.getElementById('department-form-title');
    card.style.display = 'block';

    document.getElementById('dept-edit-id').value = '';
    document.getElementById('dept-name').value = '';
    document.getElementById('dept-desc').value = '';

    if (deptId) {
        const dept = window.db.departments.find(d => d.id === deptId);
        if (!dept) return;
        title.textContent = 'Edit Department';
        document.getElementById('dept-edit-id').value = dept.id;
        document.getElementById('dept-name').value = dept.name;
        document.getElementById('dept-desc').value = dept.description;
    } else {
        title.textContent = 'Add Department';
    }

    card.scrollIntoView({ behavior: 'smooth' });
}

function hideDepartmentForm() {
    document.getElementById('department-form-card').style.display = 'none';
    document.getElementById('department-form').reset();
}

function handleDepartmentSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('dept-edit-id').value;
    const name = document.getElementById('dept-name').value.trim();
    const description = document.getElementById('dept-desc').value.trim();

    if (editId) {
        const dept = window.db.departments.find(d => d.id === parseInt(editId));
        if (!dept) return;
        dept.name = name;
        dept.description = description;
        showToast('Department updated!', 'success');
    } else {
        window.db.departments.push({
            id: Date.now(),
            name,
            description
        });
        showToast('Department created!', 'success');
    }

    saveToStorage();
    hideDepartmentForm();
    renderDepartmentsList();
}

function editDepartment(id) { showDepartmentForm(id); }

function deleteDepartment(id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (!dept) return;
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    window.db.departments = window.db.departments.filter(d => d.id !== id);
    saveToStorage();
    renderDepartmentsList();
    showToast('Department deleted.', 'success');
}

// ============================================
// PHASE 6-C: EMPLOYEES MANAGEMENT
// ============================================

function renderEmployeesList() {
    const container = document.getElementById('employees-table-container');
    if (!container) return;

    let html = `
        <div class="card">
            <div class="card-body">
                <table class="table table-striped mb-0">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Position</th><th>Dept</th><th>Actions</th></tr>
                    </thead>
                    <tbody>`;

    if (window.db.employees.length === 0) {
        html += `<tr><td colspan="5" class="text-center text-muted">No employees.</td></tr>`;
    } else {
        window.db.employees.forEach(emp => {
            const user = window.db.accounts.find(a => a.id === emp.userId);
            const userName = user ? user.email : 'Unknown';
            const dept = window.db.departments.find(d => d.id === emp.departmentId);
            const deptName = dept ? dept.name : 'Unknown';

            html += `
                <tr>
                    <td>${emp.employeeId}</td>
                    <td>${userName}</td>
                    <td>${emp.position}</td>
                    <td>${deptName}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editEmployee(${emp.id})">Edit</button>
                        <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteEmployee(${emp.id})">Delete</button>
                    </td>
                </tr>`;
        });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

function populateDeptDropdown() {
    const sel = document.getElementById('emp-dept');
    sel.innerHTML = '<option value="">Select department...</option>';
    window.db.departments.forEach(d => {
        sel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
}

function showEmployeeForm(empId = null) {
    const card = document.getElementById('employee-form-card');
    const title = document.getElementById('employee-form-title');
    card.style.display = 'block';
    populateDeptDropdown();

    document.getElementById('employee-edit-id').value = '';
    document.getElementById('emp-id').value = '';
    document.getElementById('emp-email').value = '';
    document.getElementById('emp-position').value = '';
    document.getElementById('emp-dept').value = '';
    document.getElementById('emp-hiredate').value = '';

    if (empId) {
        const emp = window.db.employees.find(e => e.id === empId);
        if (!emp) return;
        title.textContent = 'Edit Employee';
        document.getElementById('employee-edit-id').value = emp.id;
        document.getElementById('emp-id').value = emp.employeeId;
        const user = window.db.accounts.find(a => a.id === emp.userId);
        document.getElementById('emp-email').value = user ? user.email : '';
        document.getElementById('emp-position').value = emp.position;
        document.getElementById('emp-dept').value = emp.departmentId;
        document.getElementById('emp-hiredate').value = emp.hireDate;
    } else {
        title.textContent = 'Add Employee';
    }

    card.scrollIntoView({ behavior: 'smooth' });
}

function hideEmployeeForm() {
    document.getElementById('employee-form-card').style.display = 'none';
    document.getElementById('employee-form').reset();
}

function handleEmployeeSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('employee-edit-id').value;
    const employeeId = document.getElementById('emp-id').value.trim();
    const email = document.getElementById('emp-email').value.trim().toLowerCase();
    const position = document.getElementById('emp-position').value.trim();
    const departmentId = parseInt(document.getElementById('emp-dept').value);
    const hireDate = document.getElementById('emp-hiredate').value;

    // Validate user exists
    const user = window.db.accounts.find(a => a.email === email);
    if (!user) {
        showToast('No account found with that email!', 'error');
        return;
    }

    // Validate department exists
    const dept = window.db.departments.find(d => d.id === departmentId);
    if (!dept) {
        showToast('Invalid department!', 'error');
        return;
    }

    if (editId) {
        const emp = window.db.employees.find(e => e.id === parseInt(editId));
        if (!emp) return;
        emp.employeeId = employeeId;
        emp.userId = user.id;
        emp.position = position;
        emp.departmentId = departmentId;
        emp.hireDate = hireDate;
        showToast('Employee updated!', 'success');
    } else {
        window.db.employees.push({
            id: Date.now(),
            employeeId,
            userId: user.id,
            position,
            departmentId,
            hireDate
        });
        showToast('Employee added!', 'success');
    }

    saveToStorage();
    hideEmployeeForm();
    renderEmployeesList();
}

function editEmployee(id) { showEmployeeForm(id); }

function deleteEmployee(id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (!emp) return;
    if (!confirm(`Delete employee ${emp.employeeId}?`)) return;
    window.db.employees = window.db.employees.filter(e => e.id !== id);
    saveToStorage();
    renderEmployeesList();
    showToast('Employee deleted.', 'success');
}

// ============================================
// PHASE 7: USER REQUESTS
// ============================================

function renderRequests() {
    const container = document.getElementById('requests-content');
    if (!container || !currentUser) return;

    const myRequests = window.db.requests.filter(r => r.employeeEmail === currentUser.email);

    if (myRequests.length === 0) {
        container.innerHTML = `
            <p class="text-muted">You have no requests yet.</p>
            <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newRequestModal">Create One</button>
        `;
        return;
    }

    let html = `
        <div class="card">
            <div class="card-body">
                <table class="table table-striped mb-0">
                    <thead>
                        <tr><th>#</th><th>Type</th><th>Items</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>`;

    myRequests.forEach((req, i) => {
        const badgeMap = { Pending: 'warning', Approved: 'success', Rejected: 'danger' };
        const badge = badgeMap[req.status] || 'secondary';
        const itemsList = req.items.map(it => `${it.name} (×${it.qty})`).join(', ');

        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${req.type}</td>
                <td>${itemsList}</td>
                <td>${req.date}</td>
                <td><span class="badge bg-${badge}">${req.status}</span></td>
            </tr>`;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

function addRequestItem() {
    const container = document.getElementById('request-items-container');
    container.insertAdjacentHTML('beforeend', `
        <div class="row mb-2 request-item">
            <div class="col-7">
                <input type="text" class="form-control item-name" placeholder="Item name" required>
            </div>
            <div class="col-3">
                <input type="number" class="form-control item-qty" value="1" min="1" required>
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-outline-danger btn-sm remove-item-btn">×</button>
            </div>
        </div>
    `);
}

function handleRequestSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('request-type').value;
    const itemRows = document.querySelectorAll('#request-items-container .request-item');
    const items = [];

    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value) || 1;
        if (name) items.push({ name, qty });
    });

    if (items.length === 0) {
        showToast('Please add at least one item.', 'error');
        return;
    }

    window.db.requests.push({
        id: Date.now(),
        type,
        items,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        employeeEmail: currentUser.email
    });

    saveToStorage();

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('newRequestModal'));
    if (modal) modal.hide();

    // Reset form
    document.getElementById('new-request-form').reset();
    const container = document.getElementById('request-items-container');
    container.innerHTML = `
        <div class="row mb-2 request-item">
            <div class="col-7">
                <input type="text" class="form-control item-name" placeholder="Item name" required>
            </div>
            <div class="col-3">
                <input type="number" class="form-control item-qty" value="1" min="1" required>
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-outline-danger btn-sm remove-item-btn">×</button>
            </div>
        </div>
    `;

    renderRequests();
    showToast('Request submitted!', 'success');
}

// ============================================
// PHASE 3-A: REGISTRATION
// ============================================

function handleRegister(e) {
    e.preventDefault();

    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName  = document.getElementById('reg-lastname').value.trim();
    const email     = document.getElementById('reg-email').value.trim().toLowerCase();
    const password  = document.getElementById('reg-password').value;

    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    if (window.db.accounts.find(a => a.email === email)) {
        showToast('Email already registered!', 'error');
        return;
    }

    window.db.accounts.push({
        id: Date.now(),
        firstName, lastName, email, password,
        role: 'user',
        verified: false,
        createdAt: new Date().toISOString()
    });
    saveToStorage();

    localStorage.setItem('unverified_email', email);
    document.getElementById('register-form').reset();
    showToast('Registration successful! Please verify your email.', 'success');
    navigateTo('#/verify-email');
}

// ============================================
// PHASE 3-B: EMAIL VERIFICATION (Simulated)
// ============================================

function handleVerify() {
    const email = localStorage.getItem('unverified_email');
    if (!email) {
        showToast('No pending verification found.', 'warning');
        return;
    }

    const account = window.db.accounts.find(a => a.email === email);
    if (!account) {
        showToast('Account not found.', 'error');
        return;
    }

    account.verified = true;
    saveToStorage();
    localStorage.removeItem('unverified_email');

    showToast('Email verified! You may now log in.', 'success');
    navigateTo('#/login');
}

// ============================================
// PHASE 3-C: LOGIN
// ============================================

async function handleLogin(e) {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password })
        });
        const data = await res.json();

        if (res.ok) {
            sessionStorage.setItem('authToken', data.token);
            const user = normalizeUser(data.user);
            currentUser = user;
            setAuthState(true, user);
            document.getElementById('login-form').reset();
            showToast(`Welcome back, ${user.firstName}!`, 'success');
            navigateTo('#/profile');
        } else {
            showToast(`Login failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (err) {
        showToast('Network error. Try again.', 'error');
    }
}

async function loadAdminDashboard() {
    const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: getAuthHeader()
    });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('content').innerText = data.message;
    } else {
        document.getElementById('content').innerText = 'Access denied!';
    }
}

// ============================================
// PHASE 3-E: LOGOUT
// ============================================

function handleLogout(e) {
    e.preventDefault();
    sessionStorage.removeItem('authToken');
    setAuthState(false);
    showToast('Logged out successfully.', 'info');
    navigateTo('#/');
}

// ============================================
// INITIALIZATION (DOMContentLoaded)
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Restore session from API token ---
    const authToken = sessionStorage.getItem('authToken');
    if (authToken) {
        fetch(`${API_BASE}/api/profile`, {
            headers: getAuthHeader()
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                const user = normalizeUser(data.user);
                currentUser = user;
                setAuthState(true, user);
            })
            .catch(() => {
                sessionStorage.removeItem('authToken');
                setAuthState(false);
            });
    }

    // --- Wire up forms ---
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('verify-btn').addEventListener('click', handleVerify);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Admin forms
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);
    document.getElementById('account-form').addEventListener('submit', handleAccountSubmit);
    document.getElementById('department-form').addEventListener('submit', handleDepartmentSubmit);

    // Admin "+" buttons
    document.getElementById('add-employee-btn').addEventListener('click', () => showEmployeeForm());
    document.getElementById('add-account-btn').addEventListener('click', () => showAccountForm());
    document.getElementById('add-department-btn').addEventListener('click', () => showDepartmentForm());

    // Request modal
    document.getElementById('new-request-form').addEventListener('submit', handleRequestSubmit);
    document.getElementById('add-item-btn').addEventListener('click', addRequestItem);

    // Delegate remove-item clicks
    document.getElementById('request-items-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const items = document.querySelectorAll('.request-item');
            if (items.length > 1) {
                e.target.closest('.request-item').remove();
            } else {
                showToast('At least one item is required.', 'warning');
            }
        }
    });

    // --- Routing init ---
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    handleRouting();

    console.log('✅ App initialized');
});
