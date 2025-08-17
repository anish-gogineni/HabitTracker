// Habit Tracker App
class HabitTracker {
    constructor() {
        this.habits = [];
        this.completions = {};
        this.currentEditingId = null;
        this.currentCalendarMonth = new Date().getMonth();
        this.currentCalendarYear = new Date().getFullYear();
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.updateCurrentDate();
        this.updateCalendar();
    }

    // Data Management
    loadData() {
        try {
            const savedHabits = localStorage.getItem('habitTracker_habits');
            const savedCompletions = localStorage.getItem('habitTracker_completions');
            const savedTheme = localStorage.getItem('habitTracker_theme');

            if (savedHabits) {
                this.habits = JSON.parse(savedHabits);
            }

            if (savedCompletions) {
                this.completions = JSON.parse(savedCompletions);
            }

            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                this.updateDarkModeIcon(savedTheme);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    saveData() {
        try {
            localStorage.setItem('habitTracker_habits', JSON.stringify(this.habits));
            localStorage.setItem('habitTracker_completions', JSON.stringify(this.completions));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Add habit form
        document.getElementById('habit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addHabit();
        });

        // Edit habit form
        document.getElementById('edit-habit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditHabit();
        });

        // Frequency change handlers
        document.getElementById('habit-frequency').addEventListener('change', (e) => {
            this.toggleCustomFrequency('custom-frequency', e.target.value);
        });

        document.getElementById('edit-habit-frequency').addEventListener('change', (e) => {
            this.toggleCustomFrequency('edit-custom-frequency', e.target.value);
        });

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') {
                this.closeModal();
            }
        });

        // Dark mode toggle
        document.getElementById('dark-mode-toggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Export/Import
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-input').click();
        });

        document.getElementById('import-input').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => {
            this.changeCalendarMonth(-1);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.changeCalendarMonth(1);
        });
    }

    // Habit Management
    addHabit() {
        const name = document.getElementById('habit-name').value.trim();
        const frequency = document.getElementById('habit-frequency').value;
        const customDays = document.getElementById('custom-days').value;

        if (!name) return;

        const habit = {
            id: Date.now().toString(),
            name,
            frequency,
            customDays: frequency === 'custom' ? parseInt(customDays) : null,
            createdAt: new Date().toISOString(),
            streak: 0,
            bestStreak: 0
        };

        this.habits.push(habit);
        this.saveData();
        this.updateUI();
        
        // Reset form
        document.getElementById('habit-form').reset();
        document.getElementById('custom-frequency').style.display = 'none';
        
        // Add success animation
        this.showSuccess('Habit added successfully! 🎉');
    }

    editHabit(id) {
        const habit = this.habits.find(h => h.id === id);
        if (!habit) return;

        this.currentEditingId = id;
        
        // Populate form
        document.getElementById('edit-habit-name').value = habit.name;
        document.getElementById('edit-habit-frequency').value = habit.frequency;
        document.getElementById('edit-custom-days').value = habit.customDays || 3;
        
        this.toggleCustomFrequency('edit-custom-frequency', habit.frequency);
        
        // Show modal
        document.getElementById('edit-modal').classList.add('show');
    }

    saveEditHabit() {
        const name = document.getElementById('edit-habit-name').value.trim();
        const frequency = document.getElementById('edit-habit-frequency').value;
        const customDays = document.getElementById('edit-custom-days').value;

        if (!name || !this.currentEditingId) return;

        const habitIndex = this.habits.findIndex(h => h.id === this.currentEditingId);
        if (habitIndex === -1) return;

        this.habits[habitIndex] = {
            ...this.habits[habitIndex],
            name,
            frequency,
            customDays: frequency === 'custom' ? parseInt(customDays) : null
        };

        this.saveData();
        this.updateUI();
        this.closeModal();
        
        this.showSuccess('Habit updated successfully! ✨');
    }

    deleteHabit(id) {
        if (!confirm('Are you sure you want to delete this habit? This will also remove all completion history.')) {
            return;
        }

        this.habits = this.habits.filter(h => h.id !== id);
        
        // Remove completion history
        Object.keys(this.completions).forEach(date => {
            if (this.completions[date]) {
                delete this.completions[date][id];
                if (Object.keys(this.completions[date]).length === 0) {
                    delete this.completions[date];
                }
            }
        });

        this.saveData();
        this.updateUI();
        this.updateCalendar();
        
        this.showSuccess('Habit deleted successfully');
    }

    // Completion Management
    toggleHabitCompletion(habitId, date = null) {
        const completionDate = date || this.getTodayString();
        
        if (!this.completions[completionDate]) {
            this.completions[completionDate] = {};
        }

        const isCompleted = this.completions[completionDate][habitId];
        
        if (isCompleted) {
            delete this.completions[completionDate][habitId];
            if (Object.keys(this.completions[completionDate]).length === 0) {
                delete this.completions[completionDate];
            }
        } else {
            this.completions[completionDate][habitId] = true;
        }

        this.updateHabitStreaks();
        this.saveData();
        this.updateUI();
        this.updateCalendar();
        
        // Add visual feedback
        if (!isCompleted) {
            this.showSuccess('Great job! Keep it up! 🔥');
        }
    }

    isHabitCompletedOnDate(habitId, date) {
        return this.completions[date] && this.completions[date][habitId] === true;
    }

    // Streak Calculation
    updateHabitStreaks() {
        this.habits.forEach(habit => {
            const streak = this.calculateStreak(habit.id);
            habit.streak = streak;
            if (streak > habit.bestStreak) {
                habit.bestStreak = streak;
            }
        });
    }

    calculateStreak(habitId) {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) { // Check last year max
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = this.formatDate(date);
            
            if (this.isHabitCompletedOnDate(habitId, dateString)) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    calculateCompletionPercentage(habitId, days = 30) {
        let completed = 0;
        let total = days;
        const today = new Date();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = this.formatDate(date);
            
            if (this.isHabitCompletedOnDate(habitId, dateString)) {
                completed++;
            }
        }
        
        return Math.round((completed / total) * 100);
    }

    // UI Updates
    updateUI() {
        this.updateTodayHabits();
        this.updateAllHabits();
        this.updateHabitStreaks();
    }

    updateTodayHabits() {
        const container = document.getElementById('today-habits');
        const noHabitsMessage = document.getElementById('no-habits-message');
        
        if (this.habits.length === 0) {
            container.innerHTML = '';
            noHabitsMessage.style.display = 'block';
            return;
        }
        
        noHabitsMessage.style.display = 'none';
        
        const todayString = this.getTodayString();
        const todayHabits = this.habits.filter(habit => this.shouldShowHabitToday(habit));
        
        container.innerHTML = todayHabits.map(habit => {
            const isCompleted = this.isHabitCompletedOnDate(habit.id, todayString);
            const completionPercentage = this.calculateCompletionPercentage(habit.id);
            
            return `
                <div class="habit-item ${isCompleted ? 'completed' : ''} fade-in">
                    <div class="habit-checkbox ${isCompleted ? 'checked' : ''}" 
                         onclick="habitTracker.toggleHabitCompletion('${habit.id}')">
                        ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-meta">
                            <span class="habit-streak">
                                <i class="fas fa-fire ${habit.streak > 0 ? 'streak-fire' : ''}"></i>
                                ${habit.streak} day streak
                            </span>
                            <span>📊 ${completionPercentage}% (30 days)</span>
                            <span>🏆 Best: ${habit.bestStreak} days</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateAllHabits() {
        const container = document.getElementById('all-habits');
        
        if (this.habits.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No habits created yet.</p>';
            return;
        }
        
        container.innerHTML = this.habits.map(habit => {
            const completionPercentage = this.calculateCompletionPercentage(habit.id);
            const frequencyText = habit.frequency === 'custom' 
                ? `${habit.customDays} times/week`
                : habit.frequency;
            
            return `
                <div class="habit-item fade-in">
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-meta">
                            <span>📅 ${frequencyText}</span>
                            <span class="habit-streak">
                                <i class="fas fa-fire ${habit.streak > 0 ? 'streak-fire' : ''}"></i>
                                ${habit.streak} day streak
                            </span>
                        </div>
                        <div class="habit-stats">
                            <div class="stat-item">
                                <div class="stat-value">${habit.streak}</div>
                                <div class="stat-label">Current</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${habit.bestStreak}</div>
                                <div class="stat-label">Best</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${completionPercentage}%</div>
                                <div class="stat-label">30-Day</div>
                            </div>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="btn-icon" onclick="habitTracker.editHabit('${habit.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="habitTracker.deleteHabit('${habit.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    shouldShowHabitToday(habit) {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        switch (habit.frequency) {
            case 'daily':
                return true;
            case 'weekly':
                return dayOfWeek === 1; // Show on Mondays
            case 'custom':
                // For custom frequency, show every day but user decides how many times per week
                return true;
            default:
                return true;
        }
    }

    // Calendar
    updateCalendar() {
        const container = document.getElementById('calendar-container');
        const monthYear = document.getElementById('calendar-month-year');
        
        const date = new Date(this.currentCalendarYear, this.currentCalendarMonth);
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthYear.textContent = monthName;
        
        // Generate calendar
        const firstDay = new Date(this.currentCalendarYear, this.currentCalendarMonth, 1);
        const lastDay = new Date(this.currentCalendarYear, this.currentCalendarMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let calendarHTML = '';
        
        // Add day headers
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day header">${day}</div>`;
        });
        
        // Add calendar days
        const currentDate = new Date(startDate);
        for (let i = 0; i < 42; i++) { // 6 weeks max
            const isCurrentMonth = currentDate.getMonth() === this.currentCalendarMonth;
            const isToday = this.isSameDate(currentDate, new Date());
            const dateString = this.formatDate(currentDate);
            
            const completedHabits = this.completions[dateString] ? 
                Object.keys(this.completions[dateString]).length : 0;
            const totalHabits = this.habits.length;
            
            let classes = 'calendar-day';
            if (!isCurrentMonth) classes += ' other-month';
            if (isToday) classes += ' today';
            
            calendarHTML += `
                <div class="${classes}">
                    <div>${currentDate.getDate()}</div>
                    ${completedHabits > 0 ? `
                        <div class="calendar-completion" 
                             title="${completedHabits}/${totalHabits} habits completed"></div>
                    ` : ''}
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        container.innerHTML = calendarHTML;
    }

    changeCalendarMonth(direction) {
        this.currentCalendarMonth += direction;
        if (this.currentCalendarMonth < 0) {
            this.currentCalendarMonth = 11;
            this.currentCalendarYear--;
        } else if (this.currentCalendarMonth > 11) {
            this.currentCalendarMonth = 0;
            this.currentCalendarYear++;
        }
        this.updateCalendar();
    }

    // Utility Functions
    getTodayString() {
        return this.formatDate(new Date());
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    isSameDate(date1, date2) {
        return this.formatDate(date1) === this.formatDate(date2);
    }

    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        dateElement.textContent = formattedDate;
    }

    toggleCustomFrequency(elementId, frequency) {
        const customElement = document.getElementById(elementId);
        customElement.style.display = frequency === 'custom' ? 'block' : 'none';
    }

    closeModal() {
        document.getElementById('edit-modal').classList.remove('show');
        this.currentEditingId = null;
    }

    // Theme Management
    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('habitTracker_theme', newTheme);
        this.updateDarkModeIcon(newTheme);
    }

    updateDarkModeIcon(theme) {
        const icon = document.querySelector('#dark-mode-toggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Export/Import
    exportData() {
        const data = {
            habits: this.habits,
            completions: this.completions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `habit-tracker-backup-${this.getTodayString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Data exported successfully! 📁');
    }

    importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.habits || !data.completions) {
                    throw new Error('Invalid file format');
                }
                
                if (confirm('This will replace all your current data. Are you sure?')) {
                    this.habits = data.habits;
                    this.completions = data.completions;
                    this.saveData();
                    this.updateUI();
                    this.updateCalendar();
                    this.showSuccess('Data imported successfully! 🎉');
                }
            } catch (error) {
                alert('Error importing file. Please check the file format.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset input
        document.getElementById('import-input').value = '';
    }

    // Success Messages
    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 1001;
            animation: slideUp 0.3s ease-out;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app
let habitTracker;
document.addEventListener('DOMContentLoaded', () => {
    habitTracker = new HabitTracker();
});

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);
