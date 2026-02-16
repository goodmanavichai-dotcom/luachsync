// Google API Configuration
const CLIENT_ID = '792401462118-eqhkb7sihr0sli2t4ma61ru23v0i4pi4.apps.googleusercontent.com'; // 
const API_KEY = 'AIzaSyDkpN2WEpZOAjI9E6c7dH6GRn0CnTd3s14'; //
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let gapiInited = false;
let gisInited = false;
let tokenClient;
let accessToken = null;
let selectedEmails = [];

// Initialize Google API
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authBtn').disabled = false;
    }
}

// Authentication
document.getElementById('authBtn').addEventListener('click', handleAuthClick);
document.getElementById('logoutBtn').addEventListener('click', handleSignoutClick);

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        accessToken = resp.access_token;
        
        // Get user info
        const userInfo = await gapi.client.request({
            path: 'https://www.googleapis.com/oauth2/v1/userinfo'
        });
        
        document.getElementById('userEmail').textContent = userInfo.result.email;
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('formSection').style.display = 'block';
        
        // Load calendars
        loadCalendars();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('formSection').style.display = 'none';
    accessToken = null;
}

// Load user's calendars
async function loadCalendars() {
    try {
        const response = await gapi.client.calendar.calendarList.list();
        const calendars = response.result.items;
        
        const select = document.getElementById('calendarSelect');
        select.innerHTML = '<option value="">בחר יומן</option>';
        
        calendars.forEach(calendar => {
            const option = document.createElement('option');
            option.value = calendar.id;
            option.textContent = calendar.summary;
            if (calendar.primary) {
                option.textContent += ' (ראשי)';
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading calendars:', err);
        showStatus('שגיאה בטעינת היומנים', 'error');
    }
}

// Initialize Hebrew calendar dropdowns
function initHebrewCalendar() {
    const daySelect = document.getElementById('hebrewDay');
    const monthSelect = document.getElementById('hebrewMonth');
    const yearSelect = document.getElementById('hebrewYear');
    
    // Days (1-30)
    for (let i = 1; i <= 30; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }
    
    // Hebrew months
    const hebrewMonths = [
        'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
        'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
        'אדר א\'', 'אדר ב\''
    ];
    
    hebrewMonths.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    // Years (current year and next 10 years)
    const currentHebrewYear = new Hebcal.HDate().getFullYear();
    for (let i = 0; i < 11; i++) {
        const year = currentHebrewYear + i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (i === 0) option.selected = true;
        yearSelect.appendChild(option);
    }
}

// Update Gregorian date display
function updateGregorianDate() {
    const day = document.getElementById('hebrewDay').value;
    const month = document.getElementById('hebrewMonth').value;
    const year = document.getElementById('hebrewYear').value;
    
    if (day && month && year) {
        try {
            const hdate = new Hebcal.HDate(parseInt(day), parseInt(month), parseInt(year));
            const greg = hdate.greg();
            
            const display = document.getElementById('gregorianDateDisplay');
            display.textContent = `תאריך לועזי: ${greg.toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`;
        } catch (err) {
            console.error('Invalid Hebrew date:', err);
        }
    }
}

document.getElementById('hebrewDay').addEventListener('change', updateGregorianDate);
document.getElementById('hebrewMonth').addEventListener('change', updateGregorianDate);
document.getElementById('hebrewYear').addEventListener('change', updateGregorianDate);

// Counter functionality
document.getElementById('enableCounter').addEventListener('change', (e) => {
    document.getElementById('counterInput').style.display = e.target.checked ? 'block' : 'none';
});

// Email sharing
document.getElementById('addEmailBtn').addEventListener('click', () => {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();
    
    if (email && validateEmail(email) && !selectedEmails.includes(email)) {
        selectedEmails.push(email);
        updateEmailList();
        emailInput.value = '';
    }
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function updateEmailList() {
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = '';
    
    selectedEmails.forEach((email, index) => {
        const tag = document.createElement('div');
        tag.className = 'email-tag';
        tag.innerHTML = `
            ${email}
            <button type="button" onclick="removeEmail(${index})">×</button>
        `;
        emailList.appendChild(tag);
    });
}

function removeEmail(index) {
    selectedEmails.splice(index, 1);
    updateEmailList();
}

// Form submission
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'יוצר אירוע...';
    
    try {
        await createCalendarEvent();
        showStatus('האירוע נוצר בהצלחה! 🎉', 'success');
        
        // Reset form after 2 seconds
        setTimeout(() => {
            document.getElementById('eventForm').reset();
            selectedEmails = [];
            updateEmailList();
            document.getElementById('counterInput').style.display = 'none';
            hideStatus();
        }, 2000);
        
    } catch (err) {
        console.error('Error creating event:', err);
        showStatus('שגיאה ביצירת האירוע: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'צור אירוע ביומן';
    }
});

async function createCalendarEvent() {
    const eventName = document.getElementById('eventName').value;
    const description = document.getElementById('eventDescription').value;
    const calendarId = document.getElementById('calendarSelect').value;
    const day = parseInt(document.getElementById('hebrewDay').value);
    const month = parseInt(document.getElementById('hebrewMonth').value);
    const year = parseInt(document.getElementById('hebrewYear').value);
    const recurrence = document.getElementById('recurrence').value;
    const enableCounter = document.getElementById('enableCounter').checked;
    const counterStart = enableCounter ? parseInt(document.getElementById('counterStart').value) : null;
    
    // Convert Hebrew date to Gregorian
    const hdate = new Hebcal.HDate(day, month, year);
    const startDate = hdate.greg();
    
    // Format date for Google Calendar
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Build event name with counter
    let finalEventName = eventName;
    if (enableCounter && counterStart) {
        finalEventName = `${eventName} - ${counterStart}`;
    }
    
    // Build event object
    const event = {
        summary: finalEventName,
        description: description || '',
        start: {
            date: dateStr
        },
        end: {
            date: dateStr
        }
    };
    
    // Add recurrence
    if (recurrence === 'yearly') {
        // For Hebrew yearly recurrence, we'll create a custom solution
        // Google Calendar doesn't support Hebrew calendar natively
        event.recurrence = [`RRULE:FREQ=YEARLY`];
        
        // Add note about Hebrew date
        event.description += `\n\n[תאריך עברי: ${day} ב${getHebrewMonthName(month)} ${year}]`;
        
        if (enableCounter && counterStart) {
            event.description += `\n[מספר סידורי מתחיל ב-${counterStart}]`;
        }
    } else if (recurrence === 'monthly') {
        event.recurrence = [`RRULE:FREQ=MONTHLY`];
    } else if (recurrence === 'weekly') {
        event.recurrence = [`RRULE:FREQ=WEEKLY`];
    } else if (recurrence === 'daily') {
        event.recurrence = [`RRULE:FREQ=DAILY`];
    }
    
    // Add attendees
    if (selectedEmails.length > 0) {
        event.attendees = selectedEmails.map(email => ({ email }));
    }
    
    // Create event
    const response = await gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
        sendUpdates: selectedEmails.length > 0 ? 'all' : 'none'
    });
    
    return response.result;
}

function getHebrewMonthName(month) {
    const months = [
        'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
        'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
        'אדר א\'', 'אדר ב\''
    ];
    return months[month - 1];
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
}

function hideStatus() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.style.display = 'none';
}

// Initialize on page load
window.onload = () => {
    initHebrewCalendar();
};

// Load Google APIs
gapiLoaded();
gisLoaded();
