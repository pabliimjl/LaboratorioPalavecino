(function () {
    'use strict';

    function redirectLegacyMainToIndex() {
        if (/\/main\.html$/i.test(window.location.pathname)) {
            window.location.replace('index.html');
        }
    }

    function bindMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const menuMobile = document.getElementById('mainMenuMobile');

        if (!menuToggle || !menuMobile) {
            return;
        }

        menuToggle.addEventListener('click', () => {
            const isOpen = menuMobile.style.maxHeight && menuMobile.style.maxHeight !== '0px';
            menuMobile.style.maxHeight = isOpen ? '0' : '400px';
        });
    }

    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.aos, .aos-left, .aos-right');
        if (!animatedElements.length || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach((el) => observer.observe(el));
    }

    function initResultadosPage() {
        if (!document.body.classList.contains('page-resultados')) {
            return;
        }

        const supabaseConfig = window.SUPABASE_CONFIG || {};
        const storageStatus = document.getElementById('storageStatus');
        const loginForm = document.getElementById('loginForm');
        const errorMsg = document.getElementById('errorMsg');
        const loginScreen = document.getElementById('loginScreen');
        const resultsScreen = document.getElementById('resultsScreen');
        const resultsMeta = document.getElementById('resultsMeta');
        const resultsList = document.getElementById('resultsList');
        const newSearchButton = document.getElementById('newSearchButton');
        const dniInput = document.getElementById('dni');
        const accessCodeInput = document.getElementById('accessCode');

        let supabaseClient = null;

        function hasSupabaseConfig() {
            return Boolean(
                supabaseConfig.url &&
                supabaseConfig.anonKey &&
                !supabaseConfig.url.includes('TU_SUPABASE_URL') &&
                !supabaseConfig.anonKey.includes('TU_SUPABASE_ANON_KEY')
            );
        }

        function getSupabaseClient() {
            if (!hasSupabaseConfig() || !window.supabase) {
                return null;
            }

            if (!supabaseClient) {
                supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
            }

            return supabaseClient;
        }

        function setStorageStatus(message, tone) {
            storageStatus.textContent = message;
            storageStatus.className = 'mb-5 rounded-xl px-4 py-3 text-sm';

            if (tone === 'ok') {
                storageStatus.classList.add('border', 'border-emerald-200', 'bg-emerald-50', 'text-emerald-800');
                return;
            }

            storageStatus.classList.add('border', 'border-amber-200', 'bg-amber-50', 'text-amber-800');
        }

        function normalizeCode(value) {
            return value.trim().toUpperCase();
        }

        function renderResults(rows) {
            resultsList.innerHTML = '';

            rows.forEach((row, index) => {
                const item = document.createElement('article');
                item.className = 'rounded-2xl border border-emerald-100 bg-white px-4 py-4 shadow-sm';

                const createdAt = new Date(row.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                const notes = row.notes ? `<p class="mt-3 text-sm text-slate-600">${row.notes}</p>` : '';
                const linkLabel = `Descargar resultado ${index + 1}`;

                item.innerHTML = `
                    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Resultado ${index + 1}</p>
                    <p class="mt-1 text-sm text-slate-500">Fecha de carga: ${createdAt}</p>
                    ${notes}
                    <a href="${row.pdf_path}" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">${linkLabel}</a>
                `;

                resultsList.appendChild(item);
            });
        }

        async function fetchResultsByDniAndCode(dni, accessCode) {
            const client = getSupabaseClient();
            if (!client) {
                throw new Error('Supabase no configurado');
            }

            const { data, error } = await client
                .from('results')
                .select('id, pdf_path, notes, created_at, access_code, appointment:appointments!inner(dni)')
                .eq('appointment.dni', dni)
                .eq('access_code', accessCode)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        }

        function showResultsScreen(dni, count) {
            loginScreen.classList.add('hidden');
            loginForm.classList.add('hidden');
            errorMsg.classList.add('hidden');
            resultsMeta.textContent = `DNI ${dni} - ${count} resultado(s)`;
            resultsScreen.classList.remove('hidden');
        }

        function showLoginScreen() {
            resultsScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            loginForm.classList.remove('hidden');
            errorMsg.classList.add('hidden');
            loginForm.reset();
            dniInput.focus();
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMsg.classList.add('hidden');

            const dni = dniInput.value.trim();
            const accessCode = normalizeCode(accessCodeInput.value);
            accessCodeInput.value = accessCode;

            if (!dni || !accessCode) {
                errorMsg.textContent = 'Completá DNI y código de acceso.';
                errorMsg.classList.remove('hidden');
                return;
            }

            try {
                const rows = await fetchResultsByDniAndCode(dni, accessCode);
                if (rows.length === 0) {
                    errorMsg.textContent = 'No encontramos resultados con ese DNI y código.';
                    errorMsg.classList.remove('hidden');
                    return;
                }

                renderResults(rows);
                showResultsScreen(dni, rows.length);
            } catch {
                errorMsg.textContent = 'No se pudo consultar resultados. Verificá la configuración de Supabase.';
                errorMsg.classList.remove('hidden');
            }
        });

        newSearchButton.addEventListener('click', showLoginScreen);

        if (hasSupabaseConfig()) {
            setStorageStatus('Modo actual: consulta online con Supabase por DNI + código.', 'ok');
        } else {
            setStorageStatus('Modo actual: completá SUPABASE_CONFIG para consultar resultados.', 'warn');
        }
    }

    function initTurnosPage() {
        if (!document.body.classList.contains('page-turnos')) {
            return;
        }

        const specialties = [
            'Marcadores Tumorales',
            'Endocrinología, Metabolismo y Nutrición',
            'Bacteriología',
            'Oncología',
            'Cardiología',
            'Marcadores Biológicos',
            'Inmunología',
            'Alergias',
            'Fertilidad',
            'Reumatología',
            'Pediatría',
            'Micología'
        ];

        const appointmentForm = document.getElementById('appointmentForm');
        const formAlert = document.getElementById('formAlert');
        const examGrid = document.getElementById('examGrid');
        const horaSelect = document.getElementById('hora');
        const fechaInput = document.getElementById('fecha');
        const formScreen = document.getElementById('formScreen');
        const confirmationScreen = document.getElementById('confirmationScreen');
        const infoPanel = document.getElementById('infoPanel');
        const newAppointmentButton = document.getElementById('newAppointmentButton');
        const storageStatus = document.getElementById('storageStatus');
        const STORAGE_KEY = 'laboratorioTurnosReservados';
        const REMOTE_TABLE = 'appointments';
        const supabaseConfig = window.SUPABASE_CONFIG || {};

        let supabaseClient = null;

        const fields = {
            nombre: document.getElementById('nombre'),
            apellido: document.getElementById('apellido'),
            dni: document.getElementById('dni'),
            fecha: fechaInput,
            hora: horaSelect
        };

        function buildTimeOptions() {
            for (let hour = 7; hour <= 10; hour += 1) {
                for (let minute = 0; minute < 60; minute += 10) {
                    if (hour === 10 && minute > 0) {
                        break;
                    }

                    const hourLabel = String(hour).padStart(2, '0');
                    const minuteLabel = String(minute).padStart(2, '0');
                    const value = `${hourLabel}:${minuteLabel}`;
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    horaSelect.appendChild(option);
                }
            }
        }

        function buildExamOptions() {
            specialties.forEach((specialty, index) => {
                const label = document.createElement('label');
                label.className = 'flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/40';
                label.innerHTML = `
                    <input type="checkbox" name="examenes" value="${specialty}" class="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                    <span>${specialty}</span>
                `;
                label.style.transitionDelay = `${index * 0.02}s`;
                examGrid.appendChild(label);
            });
        }

        function setMinDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            fechaInput.min = `${year}-${month}-${day}`;
        }

        function isWeekday(dateValue) {
            const [year, month, day] = dateValue.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            const weekDay = selectedDate.getDay();
            return weekDay >= 1 && weekDay <= 5;
        }

        function normalizeText(value) {
            return value.trim().replace(/\s+/g, ' ');
        }

        function showFieldError(fieldName, message) {
            const field = fields[fieldName];
            const errorNode = document.querySelector(`[data-error-for="${fieldName}"]`);
            if (field) {
                field.classList.add('field-error');
            }
            if (errorNode) {
                errorNode.textContent = message;
                errorNode.classList.remove('hidden');
            }
        }

        function clearFieldError(fieldName) {
            const field = fields[fieldName];
            const errorNode = document.querySelector(`[data-error-for="${fieldName}"]`);
            if (field) {
                field.classList.remove('field-error');
            }
            if (errorNode) {
                errorNode.textContent = '';
                errorNode.classList.add('hidden');
            }
        }

        function clearAllErrors() {
            Object.keys(fields).forEach(clearFieldError);
            const examError = document.querySelector('[data-error-for="examenes"]');
            examError.textContent = '';
            examError.classList.add('hidden');
            formAlert.classList.add('hidden');
            formAlert.textContent = '';
        }

        function getSelectedExams() {
            return Array.from(document.querySelectorAll('input[name="examenes"]:checked')).map((checkbox) => checkbox.value);
        }

        function formatDate(dateValue) {
            const [year, month, day] = dateValue.split('-');
            return `${day}/${month}/${year}`;
        }

        function hasSupabaseConfig() {
            return Boolean(
                supabaseConfig.url &&
                supabaseConfig.anonKey &&
                !supabaseConfig.url.includes('TU_SUPABASE_URL') &&
                !supabaseConfig.anonKey.includes('TU_SUPABASE_ANON_KEY')
            );
        }

        function getSupabaseClient() {
            if (!hasSupabaseConfig() || !window.supabase) {
                return null;
            }

            if (!supabaseClient) {
                supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
            }

            return supabaseClient;
        }

        function setStorageStatus(message, tone) {
            storageStatus.textContent = message;
            storageStatus.className = 'mt-4 rounded-xl px-4 py-3 text-sm';

            if (tone === 'ok') {
                storageStatus.classList.add('border', 'border-emerald-200', 'bg-emerald-50', 'text-emerald-800');
                return;
            }

            if (tone === 'warn') {
                storageStatus.classList.add('border', 'border-amber-200', 'bg-amber-50', 'text-amber-800');
                return;
            }

            storageStatus.classList.add('border', 'border-red-200', 'bg-red-50', 'text-red-700');
        }

        function saveAppointmentLocal(values) {
            const existingAppointments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const appointment = {
                id: Date.now(),
                nombre: values.nombre,
                apellido: values.apellido,
                dni: values.dni,
                fecha: values.fecha,
                hora: values.hora,
                examenes: values.examenes,
                creadoEl: new Date().toISOString()
            };

            existingAppointments.unshift(appointment);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existingAppointments));
            return appointment;
        }

        async function saveAppointmentRemote(values) {
            const client = getSupabaseClient();
            if (!client) {
                return false;
            }

            const payload = {
                first_name: values.nombre,
                last_name: values.apellido,
                dni: values.dni,
                appointment_date: values.fecha,
                appointment_time: values.hora,
                exams: values.examenes
            };

            const { error } = await client.from(REMOTE_TABLE).insert([payload]);
            if (error) {
                throw error;
            }

            return true;
        }

        function scrollToFirstError() {
            if (!window.matchMedia('(max-width: 767px)').matches) {
                return;
            }

            const firstInvalidField = document.querySelector('.field-error');
            const examError = document.querySelector('[data-error-for="examenes"]');
            const target = firstInvalidField || (!examError.classList.contains('hidden') ? examGrid : formAlert);

            if (!target) {
                return;
            }

            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (firstInvalidField && typeof firstInvalidField.focus === 'function') {
                window.setTimeout(() => {
                    firstInvalidField.focus({ preventScroll: true });
                }, 250);
            }
        }

        function validateForm() {
            clearAllErrors();

            const values = {
                nombre: normalizeText(fields.nombre.value),
                apellido: normalizeText(fields.apellido.value),
                dni: fields.dni.value.trim(),
                fecha: fields.fecha.value,
                hora: fields.hora.value,
                examenes: getSelectedExams()
            };

            const missingFields = [];
            const textPattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü'\- ]+$/;
            const dniPattern = /^\d{7,8}$/;

            if (!values.nombre) {
                missingFields.push('nombre');
                showFieldError('nombre', 'Ingresá tu nombre.');
            } else if (!textPattern.test(values.nombre)) {
                showFieldError('nombre', 'El nombre solo puede contener letras y espacios.');
            }

            if (!values.apellido) {
                missingFields.push('apellido');
                showFieldError('apellido', 'Ingresá tu apellido.');
            } else if (!textPattern.test(values.apellido)) {
                showFieldError('apellido', 'El apellido solo puede contener letras y espacios.');
            }

            if (!values.dni) {
                missingFields.push('dni');
                showFieldError('dni', 'Ingresá tu DNI.');
            } else if (!dniPattern.test(values.dni)) {
                showFieldError('dni', 'El DNI debe tener 7 u 8 numeros.');
            }

            if (!values.fecha) {
                missingFields.push('fecha');
                showFieldError('fecha', 'Seleccioná una fecha.');
            } else if (values.fecha < fechaInput.min) {
                showFieldError('fecha', 'La fecha no puede ser anterior a hoy.');
            } else if (!isWeekday(values.fecha)) {
                showFieldError('fecha', 'Solo podés elegir dias de lunes a viernes.');
            }

            if (!values.hora) {
                missingFields.push('hora');
                showFieldError('hora', 'Seleccioná un horario disponible.');
            }

            if (values.examenes.length === 0) {
                missingFields.push('examenes');
                const examError = document.querySelector('[data-error-for="examenes"]');
                examError.textContent = 'Seleccioná al menos un examen.';
                examError.classList.remove('hidden');
            }

            const invalidMessages = [];
            if (missingFields.length > 0) {
                const labels = {
                    nombre: 'nombre',
                    apellido: 'apellido',
                    dni: 'DNI',
                    fecha: 'fecha',
                    hora: 'hora',
                    examenes: 'examenes'
                };
                invalidMessages.push(`Faltan completar: ${missingFields.map((field) => labels[field]).join(', ')}.`);
            }

            const hasErrors = document.querySelectorAll('.field-error').length > 0 || values.examenes.length === 0;
            if (hasErrors) {
                invalidMessages.push('Revisá los campos marcados y corregí los datos antes de confirmar.');
                formAlert.innerHTML = invalidMessages.join('<br>');
                formAlert.classList.remove('hidden');
                scrollToFirstError();
                return null;
            }

            return values;
        }

        function fillSummary(values) {
            document.getElementById('summaryPaciente').textContent = `${values.nombre} ${values.apellido}`;
            document.getElementById('summaryDni').textContent = values.dni;
            document.getElementById('summaryFecha').textContent = formatDate(values.fecha);
            document.getElementById('summaryHora').textContent = values.hora;

            const summaryExamenes = document.getElementById('summaryExamenes');
            summaryExamenes.innerHTML = '';
            values.examenes.forEach((exam) => {
                const item = document.createElement('li');
                item.className = 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900';
                item.textContent = exam;
                summaryExamenes.appendChild(item);
            });
        }

        appointmentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const validatedValues = validateForm();
            if (!validatedValues) {
                return;
            }

            saveAppointmentLocal(validatedValues);
            try {
                const storedRemotely = await saveAppointmentRemote(validatedValues);
                if (storedRemotely) {
                    setStorageStatus('Modo actual: guardado en Supabase y respaldo local.', 'ok');
                }
            } catch {
                setStorageStatus('No se pudo guardar en Supabase. Se guardo localmente en este navegador.', 'warn');
            }

            fillSummary(validatedValues);
            formScreen.classList.add('hidden');
            confirmationScreen.classList.remove('hidden');
            infoPanel.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        newAppointmentButton.addEventListener('click', () => {
            appointmentForm.reset();
            clearAllErrors();
            formScreen.classList.remove('hidden');
            confirmationScreen.classList.add('hidden');
            infoPanel.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        Object.keys(fields).forEach((fieldName) => {
            fields[fieldName].addEventListener('input', () => clearFieldError(fieldName));
            fields[fieldName].addEventListener('change', () => clearFieldError(fieldName));
        });

        fechaInput.addEventListener('change', () => {
            if (fechaInput.value && !isWeekday(fechaInput.value)) {
                fechaInput.value = '';
                showFieldError('fecha', 'Solo podés elegir dias de lunes a viernes.');
                formAlert.textContent = 'La fecha seleccionada no es valida. Elegí un dia habil de lunes a viernes.';
                formAlert.classList.remove('hidden');
                scrollToFirstError();
            }
        });

        document.addEventListener('change', (event) => {
            if (event.target.name === 'examenes') {
                const examError = document.querySelector('[data-error-for="examenes"]');
                examError.textContent = '';
                examError.classList.add('hidden');
            }
        });

        buildTimeOptions();
        buildExamOptions();
        setMinDate();

        if (hasSupabaseConfig()) {
            setStorageStatus('Modo actual: Supabase configurado. Los turnos se guardan en la nube con respaldo local.', 'ok');
        } else {
            setStorageStatus('Modo actual: guardado local en este navegador. Configurá Supabase para centralizar turnos.', 'warn');
        }
    }

    function initTurnosReservadosPage() {
        if (!document.body.classList.contains('page-turnos-reservados')) {
            return;
        }

        const STORAGE_KEY = 'laboratorioTurnosReservados';
        const REMOTE_TABLE = 'appointments';
        const supabaseConfig = window.SUPABASE_CONFIG || {};
        const appointmentsList = document.getElementById('appointmentsList');
        const emptyState = document.getElementById('emptyState');
        const clearAppointmentsButton = document.getElementById('clearAppointmentsButton');
        const sourceBadge = document.getElementById('sourceBadge');
        const sourceDescription = document.getElementById('sourceDescription');
        const editModal = document.getElementById('editModal');
        const editAppointmentForm = document.getElementById('editAppointmentForm');
        const editModalAlert = document.getElementById('editModalAlert');
        const editAppointmentId = document.getElementById('editAppointmentId');
        const editFecha = document.getElementById('editFecha');
        const editHora = document.getElementById('editHora');
        const editExamenes = document.getElementById('editExamenes');
        const closeEditModalButton = document.getElementById('closeEditModalButton');
        const cancelEditButton = document.getElementById('cancelEditButton');

        let supabaseClient = null;
        let currentAppointments = [];
        let currentMode = 'local';

        function hasSupabaseConfig() {
            return Boolean(
                supabaseConfig.url &&
                supabaseConfig.anonKey &&
                !supabaseConfig.url.includes('TU_SUPABASE_URL') &&
                !supabaseConfig.anonKey.includes('TU_SUPABASE_ANON_KEY')
            );
        }

        function getSupabaseClient() {
            if (!hasSupabaseConfig() || !window.supabase) {
                return null;
            }

            if (!supabaseClient) {
                supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
            }

            return supabaseClient;
        }

        function setSourceUi(mode) {
            if (mode === 'remote') {
                sourceBadge.textContent = 'Supabase';
                sourceDescription.textContent = 'Esta página muestra los turnos guardados en Supabase. Podés consultarlos desde cualquier dispositivo que use la misma base.';
                return;
            }

            sourceBadge.textContent = 'Registro local';
            sourceDescription.textContent = 'Esta página muestra los turnos guardados en este navegador. Si abrís el sitio desde otro dispositivo o borrás los datos del navegador, esta lista no se comparte.';
        }

        function readAppointmentsLocal() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            } catch {
                return [];
            }
        }

        async function readAppointmentsRemote() {
            const client = getSupabaseClient();
            if (!client) {
                return null;
            }

            const { data, error } = await client
                .from(REMOTE_TABLE)
                .select('id, first_name, last_name, dni, appointment_date, appointment_time, exams, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                return null;
            }

            return data.map((row) => ({
                id: row.id,
                nombre: row.first_name,
                apellido: row.last_name,
                dni: row.dni,
                fecha: row.appointment_date,
                hora: row.appointment_time ? row.appointment_time.slice(0, 5) : '',
                examenes: Array.isArray(row.exams) ? row.exams : [],
                creadoEl: row.created_at
            }));
        }

        function formatDate(dateValue) {
            const [year, month, day] = dateValue.split('-');
            return `${day}/${month}/${year}`;
        }

        function formatCreatedAt(dateValue) {
            const date = new Date(dateValue);
            return date.toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function isWeekday(dateValue) {
            const [year, month, day] = dateValue.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            const weekDay = selectedDate.getDay();
            return weekDay >= 1 && weekDay <= 5;
        }

        function setEditMinDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            editFecha.min = `${year}-${month}-${day}`;
        }

        function buildEditTimeOptions() {
            for (let hour = 7; hour <= 10; hour += 1) {
                for (let minute = 0; minute < 60; minute += 10) {
                    if (hour === 10 && minute > 0) {
                        break;
                    }

                    const hourLabel = String(hour).padStart(2, '0');
                    const minuteLabel = String(minute).padStart(2, '0');
                    const value = `${hourLabel}:${minuteLabel}`;
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    editHora.appendChild(option);
                }
            }
        }

        function openEditModal(appointmentId) {
            const appointment = currentAppointments.find((item) => String(item.id) === String(appointmentId));
            if (!appointment) {
                return;
            }

            editAppointmentId.value = appointment.id;
            editFecha.value = appointment.fecha;
            editHora.value = appointment.hora;
            editExamenes.value = appointment.examenes.join(', ');
            editModalAlert.classList.add('hidden');
            editModalAlert.textContent = '';
            editModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }

        function closeEditModal() {
            editModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            editAppointmentForm.reset();
            editAppointmentId.value = '';
            editModalAlert.classList.add('hidden');
            editModalAlert.textContent = '';
        }

        function getEditedExams() {
            return editExamenes.value
                .split(',')
                .map((exam) => exam.trim())
                .filter((exam) => exam.length > 0);
        }

        async function deleteAppointment(appointmentId) {
            if (currentMode === 'remote') {
                const client = getSupabaseClient();
                if (!client) {
                    alert('No se pudo conectar con Supabase para borrar el turno.');
                    return;
                }

                const remoteId = Number(appointmentId);
                const { error } = await client.from(REMOTE_TABLE).delete().eq('id', remoteId);
                if (error) {
                    alert('No se pudo borrar el turno en Supabase. Revisá políticas RLS de delete para anon.');
                    return;
                }
            } else {
                const localAppointments = readAppointmentsLocal();
                const updatedAppointments = localAppointments.filter((item) => String(item.id) !== String(appointmentId));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
            }

            await renderAppointments();
        }

        async function updateAppointment(appointmentId, values) {
            if (currentMode === 'remote') {
                const client = getSupabaseClient();
                if (!client) {
                    throw new Error('supabase-unavailable');
                }

                const remoteId = Number(appointmentId);

                const payload = {
                    appointment_date: values.fecha,
                    appointment_time: values.hora,
                    exams: values.examenes
                };

                const { error } = await client.from(REMOTE_TABLE).update(payload).eq('id', remoteId);
                if (error) {
                    throw error;
                }
            } else {
                const localAppointments = readAppointmentsLocal();
                const updatedAppointments = localAppointments.map((item) => {
                    if (String(item.id) !== String(appointmentId)) {
                        return item;
                    }

                    return {
                        ...item,
                        fecha: values.fecha,
                        hora: values.hora,
                        examenes: values.examenes
                    };
                });

                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
            }
        }

        async function renderAppointments() {
            const remoteAppointments = await readAppointmentsRemote();
            const appointments = remoteAppointments || readAppointmentsLocal();
            currentAppointments = appointments;
            currentMode = remoteAppointments ? 'remote' : 'local';
            setSourceUi(remoteAppointments ? 'remote' : 'local');
            appointmentsList.innerHTML = '';

            if (appointments.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');

            appointments.forEach((appointment) => {
                const card = document.createElement('article');
                card.className = 'rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-xl shadow-emerald-100/40';
                card.innerHTML = `
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Turno reservado</p>
                            <h2 class="mt-2 text-2xl font-bold text-slate-900">${appointment.nombre} ${appointment.apellido}</h2>
                        </div>
                        <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">${appointment.hora}</span>
                    </div>
                    <dl class="mt-5 grid gap-3 sm:grid-cols-2">
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt class="text-sm font-semibold text-slate-500">DNI</dt>
                            <dd class="mt-1 text-base font-bold text-slate-900">${appointment.dni}</dd>
                        </div>
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt class="text-sm font-semibold text-slate-500">Fecha</dt>
                            <dd class="mt-1 text-base font-bold text-slate-900">${formatDate(appointment.fecha)}</dd>
                        </div>
                        <div class="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                            <dt class="text-sm font-semibold text-slate-500">Registrado</dt>
                            <dd class="mt-1 text-base font-bold text-slate-900">${formatCreatedAt(appointment.creadoEl)}</dd>
                        </div>
                    </dl>
                    <div class="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                        <h3 class="text-sm font-semibold text-slate-500">Examenes</h3>
                        <ul class="mt-3 flex flex-wrap gap-2">
                            ${appointment.examenes.map((exam) => `<li class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900">${exam}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="mt-5 flex flex-wrap gap-3">
                        <button type="button" class="js-edit inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50" data-id="${appointment.id}">Editar</button>
                        <button type="button" class="js-delete inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" data-id="${appointment.id}">Borrar</button>
                    </div>
                `;
                appointmentsList.appendChild(card);
            });
        }

        appointmentsList.addEventListener('click', async (event) => {
            const editButton = event.target.closest('.js-edit');
            const deleteButton = event.target.closest('.js-delete');

            if (editButton) {
                openEditModal(editButton.dataset.id);
                return;
            }

            if (deleteButton) {
                const confirmed = window.confirm('¿Querés borrar este turno? Esta acción no se puede deshacer.');
                if (!confirmed) {
                    return;
                }

                await deleteAppointment(deleteButton.dataset.id);
            }
        });

        editAppointmentForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const values = {
                fecha: editFecha.value,
                hora: editHora.value,
                examenes: getEditedExams()
            };

            if (!values.fecha || !values.hora || values.examenes.length === 0) {
                editModalAlert.textContent = 'Completá fecha, horario y al menos un examen.';
                editModalAlert.classList.remove('hidden');
                return;
            }

            if (!isWeekday(values.fecha)) {
                editModalAlert.textContent = 'Solo podés elegir días de lunes a viernes.';
                editModalAlert.classList.remove('hidden');
                return;
            }

            if (values.fecha < editFecha.min) {
                editModalAlert.textContent = 'La fecha no puede ser anterior a hoy.';
                editModalAlert.classList.remove('hidden');
                return;
            }

            try {
                await updateAppointment(editAppointmentId.value, values);
                closeEditModal();
                await renderAppointments();
            } catch {
                editModalAlert.textContent = 'No se pudieron guardar los cambios. Intentá nuevamente.';
                editModalAlert.classList.remove('hidden');
            }
        });

        closeEditModalButton.addEventListener('click', closeEditModal);
        cancelEditButton.addEventListener('click', closeEditModal);
        editModal.addEventListener('click', (event) => {
            if (event.target === editModal) {
                closeEditModal();
            }
        });

        clearAppointmentsButton.addEventListener('click', async () => {
            localStorage.removeItem(STORAGE_KEY);
            if (hasSupabaseConfig()) {
                alert('Supabase está activo: este botón solo limpia el respaldo local del navegador.');
            }
            await renderAppointments();
        });

        buildEditTimeOptions();
        setEditMinDate();
        renderAppointments();
    }

    function initPanelPage() {
        if (!document.body.classList.contains('page-panel')) {
            return;
        }

        const PANEL_USER = 'admin';
        const PANEL_PASS = 'palavecino2026';

        const SESSION_KEY = 'panelAuth';
        const STORAGE_KEY = 'laboratorioTurnosReservados';
        const REMOTE_TABLE = 'appointments';
        const supabaseConfig = window.SUPABASE_CONFIG || {};

        const loginScreen = document.getElementById('loginScreen');
        const panelScreen = document.getElementById('panelScreen');
        const loginForm = document.getElementById('loginForm');
        const loginAlert = document.getElementById('loginAlert');
        const logoutButton = document.getElementById('logoutButton');
        const sourceBadge = document.getElementById('sourceBadge');
        const sourceDescription = document.getElementById('sourceDescription');
        const appointmentsList = document.getElementById('appointmentsList');
        const emptyState = document.getElementById('emptyState');
        const emptyStateMsg = document.getElementById('emptyStateMsg');
        const clearAppointmentsButton = document.getElementById('clearAppointmentsButton');
        const refreshButton = document.getElementById('refreshButton');
        const statsBar = document.getElementById('statsBar');
        const statTotal = document.getElementById('statTotal');
        const statShowing = document.getElementById('statShowing');
        const filterText = document.getElementById('filterText');
        const filterFecha = document.getElementById('filterFecha');
        const clearFiltersButton = document.getElementById('clearFilters');
        const editModal = document.getElementById('editModal');
        const editAppointmentForm = document.getElementById('editAppointmentForm');
        const editModalAlert = document.getElementById('editModalAlert');
        const editAppointmentId = document.getElementById('editAppointmentId');
        const editFecha = document.getElementById('editFecha');
        const editHora = document.getElementById('editHora');
        const editExamenes = document.getElementById('editExamenes');
        const closeEditModalButton = document.getElementById('closeEditModalButton');
        const cancelEditButton = document.getElementById('cancelEditButton');
        const uploadModal = document.getElementById('uploadModal');
        const uploadForm = document.getElementById('uploadForm');
        const uploadModalAlert = document.getElementById('uploadModalAlert');
        const uploadModalSuccess = document.getElementById('uploadModalSuccess');
        const uploadUrl = document.getElementById('uploadUrl');
        const uploadNotes = document.getElementById('uploadNotes');
        const closeUploadModalButton = document.getElementById('closeUploadModalButton');
        const cancelUploadButton = document.getElementById('cancelUploadButton');
        const uploadSubmitButton = document.getElementById('uploadSubmitButton');
        const uploadPatientName = document.getElementById('uploadPatientName');
        const uploadPatientDetails = document.getElementById('uploadPatientDetails');
        const uploadCredentialsBox = document.getElementById('uploadCredentialsBox');
        const savedResultDni = document.getElementById('savedResultDni');
        const savedResultAccessCode = document.getElementById('savedResultAccessCode');
        const copyFeedback = document.getElementById('copyFeedback');
        const copyDniButton = document.getElementById('copyDniButton');
        const copyCodeButton = document.getElementById('copyCodeButton');
        const copyBothButton = document.getElementById('copyBothButton');

        let supabaseClient = null;
        let allAppointments = [];
        let currentMode = 'local';
        const RESULTS_TABLE = 'results';

        let allResults = {};
        let uploadTargetId = null;

        function isLoggedIn() {
            return sessionStorage.getItem(SESSION_KEY) === '1';
        }

        function showPanel() {
            loginScreen.classList.add('hidden');
            loginScreen.classList.remove('flex');
            panelScreen.classList.remove('hidden');
            panelScreen.classList.add('flex');
            buildEditTimeOptions();
            setEditMinDate();
            renderAppointments();
        }

        function showLogin() {
            panelScreen.classList.add('hidden');
            panelScreen.classList.remove('flex');
            loginScreen.classList.remove('hidden');
            loginScreen.classList.add('flex');
            document.getElementById('loginUser').value = '';
            document.getElementById('loginPass').value = '';
            loginAlert.classList.add('hidden');
        }

        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;

            if (user === PANEL_USER && pass === PANEL_PASS) {
                sessionStorage.setItem(SESSION_KEY, '1');
                loginAlert.classList.add('hidden');
                showPanel();
            } else {
                loginAlert.textContent = 'Usuario o contraseña incorrectos.';
                loginAlert.classList.remove('hidden');
                document.getElementById('loginPass').value = '';
            }
        });

        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem(SESSION_KEY);
            showLogin();
        });

        function hasSupabaseConfig() {
            return Boolean(
                supabaseConfig.url &&
                supabaseConfig.anonKey &&
                !supabaseConfig.url.includes('TU_SUPABASE_URL') &&
                !supabaseConfig.anonKey.includes('TU_SUPABASE_ANON_KEY')
            );
        }

        function getSupabaseClient() {
            if (!hasSupabaseConfig() || !window.supabase) return null;
            if (!supabaseClient) {
                supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
            }
            return supabaseClient;
        }

        function readAppointmentsLocal() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            } catch {
                return [];
            }
        }

        async function readAppointmentsRemote() {
            const client = getSupabaseClient();
            if (!client) return null;

            const { data, error } = await client
                .from(REMOTE_TABLE)
                .select('id, first_name, last_name, dni, appointment_date, appointment_time, exams, created_at')
                .order('appointment_date', { ascending: true });

            if (error) return null;

            return data.map((row) => ({
                id: row.id,
                nombre: row.first_name,
                apellido: row.last_name,
                dni: row.dni,
                fecha: row.appointment_date,
                hora: row.appointment_time ? row.appointment_time.slice(0, 5) : '',
                examenes: Array.isArray(row.exams) ? row.exams : [],
                creadoEl: row.created_at
            }));
        }

        async function readResultsMap() {
            const client = getSupabaseClient();
            if (!client) return {};
            const { data, error } = await client
                .from(RESULTS_TABLE)
                .select('id, appointment_id, pdf_path, access_code, notes, created_at')
                .order('created_at', { ascending: true });
            if (error || !data) return {};
            const map = {};
            data.forEach((row) => {
                const key = String(row.appointment_id);
                if (!map[key]) map[key] = [];
                map[key].push({
                    id: row.id,
                    pdf_path: row.pdf_path,
                    accessCode: row.access_code,
                    notes: row.notes,
                    creadoEl: row.created_at
                });
            });
            return map;
        }

        function setSourceUi(mode) {
            if (mode === 'remote') {
                sourceBadge.textContent = 'Supabase';
                sourceDescription.textContent = 'Mostrando turnos desde Supabase. Podés consultarlos desde cualquier dispositivo.';
            } else {
                sourceBadge.textContent = 'Registro local';
                sourceDescription.textContent = 'Mostrando turnos guardados localmente en este navegador.';
            }
        }

        function formatDate(dateValue) {
            const [year, month, day] = dateValue.split('-');
            return `${day}/${month}/${year}`;
        }

        function formatCreatedAt(dateValue) {
            const date = new Date(dateValue);
            return date.toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }

        function isWeekday(dateValue) {
            const [year, month, day] = dateValue.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            return d.getDay() >= 1 && d.getDay() <= 5;
        }

        function applyFilters(appointments) {
            const text = filterText.value.trim().toLowerCase();
            const fecha = filterFecha.value;

            return appointments.filter((a) => {
                const matchText = !text || (
                    a.nombre.toLowerCase().includes(text) ||
                    a.apellido.toLowerCase().includes(text) ||
                    a.dni.includes(text)
                );
                const matchFecha = !fecha || a.fecha === fecha;
                return matchText && matchFecha;
            });
        }

        filterText.addEventListener('input', () => renderList(allAppointments));
        filterFecha.addEventListener('change', () => renderList(allAppointments));
        clearFiltersButton.addEventListener('click', () => {
            filterText.value = '';
            filterFecha.value = '';
            renderList(allAppointments);
        });

        function renderList(appointments) {
            const filtered = applyFilters(appointments);
            appointmentsList.innerHTML = '';

            statTotal.textContent = appointments.length;
            statShowing.textContent = filtered.length;

            if (appointments.length > 0) {
                statsBar.classList.remove('hidden');
            }

            if (filtered.length === 0) {
                emptyState.classList.remove('hidden');
                emptyStateMsg.textContent = appointments.length === 0
                    ? 'Cuando se confirme un turno, va a aparecer listado acá.'
                    : 'No se encontraron turnos con los filtros aplicados.';
                return;
            }

            emptyState.classList.add('hidden');

            filtered.forEach((appointment) => {
                const results = allResults[String(appointment.id)] || [];
                const resultHtml = results.length > 0
                    ? `<div class="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                           <div class="flex items-center justify-between gap-3 flex-wrap">
                               <div class="flex items-center gap-2">
                                   <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                   <span class="text-sm font-semibold text-emerald-700">${results.length === 1 ? 'Resultado cargado' : results.length + ' resultados cargados'}</span>
                               </div>
                               <button type="button" class="js-upload-pdf inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50" data-id="${appointment.id}">
                                   <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                                   Agregar
                               </button>
                           </div>
                           <ul class="mt-3 flex flex-col gap-2">
                               ${results.map((r, i) => `
                               <li class="flex items-center justify-between gap-3">
                                   <span class="text-xs text-slate-500">${i + 1}. ${r.notes ? r.notes : r.pdf_path.length > 50 ? r.pdf_path.slice(0, 50) + '...' : r.pdf_path}</span>
                                   <div class="flex items-center gap-2">
                                       <button type="button" class="js-view-pdf inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50" data-path="${r.pdf_path}">
                                           <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                           Ver
                                       </button>
                                       <button type="button" class="js-edit-result inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50" data-result-id="${r.id}">
                                           Editar
                                       </button>
                                       <button type="button" class="js-delete-result inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" data-result-id="${r.id}">
                                           Borrar
                                       </button>
                                   </div>
                               </li>`).join('')}
                           </ul>
                       </div>`
                    : `<div class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 flex items-center justify-between gap-3">
                           <span class="text-sm text-slate-400">Sin resultado cargado</span>
                           <button type="button" class="js-upload-pdf inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50" data-id="${appointment.id}">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                               Agregar resultado
                           </button>
                       </div>`;
                const card = document.createElement('article');
                card.className = 'rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-xl shadow-emerald-100/40';
                card.innerHTML = `
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Turno reservado</p>
                            <h3 class="mt-2 text-2xl font-bold text-slate-900">${appointment.nombre} ${appointment.apellido}</h3>
                        </div>
                        <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">${appointment.hora}</span>
                    </div>
                    <dl class="mt-5 grid gap-3 sm:grid-cols-2">
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt class="text-sm font-semibold text-slate-500">DNI</dt>
                            <dd class="mt-1 text-base font-bold text-slate-900">${appointment.dni}</dd>
                        </div>
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <dt class="text-sm font-semibold text-slate-500">Fecha</dt>
                            <dd class="mt-1 text-base font-bold text-slate-900">${formatDate(appointment.fecha)}</dd>
                        </div>
                        <div class="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                            <dt class="text-sm font-semibold text-slate-500">Registrado</dt>
                            <dd class="mt-1 text-base font-bold text-slate-900">${formatCreatedAt(appointment.creadoEl)}</dd>
                        </div>
                    </dl>
                    <div class="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                        <h4 class="text-sm font-semibold text-slate-500">Examenes</h4>
                        <ul class="mt-3 flex flex-wrap gap-2">
                            ${appointment.examenes.map((exam) => `<li class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900">${exam}</li>`).join('')}
                        </ul>
                    </div>
                    ${resultHtml}
                    <div class="mt-5 flex flex-wrap gap-3">
                        <button type="button" class="js-edit inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50" data-id="${appointment.id}">Editar</button>
                        <button type="button" class="js-delete inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" data-id="${appointment.id}">Borrar</button>
                    </div>
                `;
                appointmentsList.appendChild(card);
            });
        }

        async function renderAppointments() {
            sourceBadge.textContent = 'Cargando...';
            sourceDescription.textContent = '';
            appointmentsList.innerHTML = '';
            emptyState.classList.add('hidden');
            statsBar.classList.add('hidden');

            const remoteAppointments = await readAppointmentsRemote();
            const appointments = remoteAppointments || readAppointmentsLocal();
            allAppointments = appointments;
            currentMode = remoteAppointments ? 'remote' : 'local';
            setSourceUi(currentMode);
            allResults = currentMode === 'remote' ? await readResultsMap() : {};
            renderList(appointments);
        }

        refreshButton.addEventListener('click', renderAppointments);

        async function deleteAppointment(appointmentId) {
            if (currentMode === 'remote') {
                const client = getSupabaseClient();
                if (!client) { alert('No se pudo conectar con Supabase.'); return; }
                const { error } = await client.from(REMOTE_TABLE).delete().eq('id', Number(appointmentId));
                if (error) { alert('No se pudo borrar el turno en Supabase.'); return; }
            } else {
                const list = readAppointmentsLocal().filter((item) => String(item.id) !== String(appointmentId));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            }
            await renderAppointments();
        }

        function findResultById(resultId) {
            const target = String(resultId);
            const groups = Object.values(allResults || {});
            for (const rows of groups) {
                const found = rows.find((item) => String(item.id) === target);
                if (found) return found;
            }
            return null;
        }

        async function deleteResult(resultId) {
            const client = getSupabaseClient();
            if (!client) throw new Error('supabase-unavailable');
            const { error } = await client.from(RESULTS_TABLE).delete().eq('id', Number(resultId));
            if (error) throw error;
        }

        async function updateResult(resultId, payload) {
            const client = getSupabaseClient();
            if (!client) throw new Error('supabase-unavailable');
            const { error } = await client.from(RESULTS_TABLE).update(payload).eq('id', Number(resultId));
            if (error) throw error;
        }

        appointmentsList.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('.js-edit');
            const deleteBtn = event.target.closest('.js-delete');
            const uploadPdfBtn = event.target.closest('.js-upload-pdf');
            const viewPdfBtn = event.target.closest('.js-view-pdf');
            const editResultBtn = event.target.closest('.js-edit-result');
            const deleteResultBtn = event.target.closest('.js-delete-result');

            if (editBtn) { openEditModal(editBtn.dataset.id); return; }
            if (uploadPdfBtn) { openUploadModal(uploadPdfBtn.dataset.id); return; }
            if (viewPdfBtn) { viewResultPdf(viewPdfBtn.dataset.path); return; }

            if (editResultBtn) {
                const resultId = editResultBtn.dataset.resultId;
                const current = findResultById(resultId);
                if (!current) {
                    alert('No se encontró el resultado a editar.');
                    return;
                }

                const newUrl = window.prompt('Editá la URL del PDF:', current.pdf_path || '');
                if (newUrl === null) return;
                const trimmedUrl = newUrl.trim();
                if (!trimmedUrl) {
                    alert('La URL no puede quedar vacía.');
                    return;
                }
                try {
                    new URL(trimmedUrl);
                } catch {
                    alert('La URL ingresada no es válida.');
                    return;
                }

                const newNotes = window.prompt('Editá las notas (opcional):', current.notes || '');
                if (newNotes === null) return;

                try {
                    await updateResult(resultId, {
                        pdf_path: trimmedUrl,
                        notes: newNotes.trim() || null
                    });
                    await renderAppointments();
                } catch {
                    alert('No se pudo editar el resultado en Supabase.');
                }
                return;
            }

            if (deleteResultBtn) {
                const resultId = deleteResultBtn.dataset.resultId;
                if (!window.confirm('¿Querés borrar este resultado PDF? Esta acción no se puede deshacer.')) return;
                try {
                    await deleteResult(resultId);
                    await renderAppointments();
                } catch {
                    alert('No se pudo borrar el resultado en Supabase.');
                }
                return;
            }

            if (deleteBtn) {
                if (!window.confirm('¿Querés borrar este turno? Esta acción no se puede deshacer.')) return;
                await deleteAppointment(deleteBtn.dataset.id);
            }
        });

        clearAppointmentsButton.addEventListener('click', async () => {
            if (!window.confirm('¿Querés borrar TODOS los turnos? Esta acción no se puede deshacer.')) return;
            if (currentMode === 'remote') {
                alert('Supabase está activo: este botón solo limpia el respaldo local del navegador.');
            }
            localStorage.removeItem(STORAGE_KEY);
            await renderAppointments();
        });

        function setEditMinDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            editFecha.min = `${year}-${month}-${day}`;
        }

        function buildEditTimeOptions() {
            editHora.innerHTML = '<option value="">Seleccioná un horario</option>';
            for (let hour = 7; hour <= 10; hour++) {
                for (let minute = 0; minute < 60; minute += 10) {
                    if (hour === 10 && minute > 0) break;
                    const h = String(hour).padStart(2, '0');
                    const m = String(minute).padStart(2, '0');
                    const opt = document.createElement('option');
                    opt.value = `${h}:${m}`;
                    opt.textContent = `${h}:${m}`;
                    editHora.appendChild(opt);
                }
            }
        }

        function openEditModal(appointmentId) {
            const appointment = allAppointments.find((item) => String(item.id) === String(appointmentId));
            if (!appointment) return;
            editAppointmentId.value = appointment.id;
            editFecha.value = appointment.fecha;
            editHora.value = appointment.hora;
            editExamenes.value = appointment.examenes.join(', ');
            editModalAlert.classList.add('hidden');
            editModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }

        function closeEditModal() {
            editModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            editAppointmentForm.reset();
            editAppointmentId.value = '';
            editModalAlert.classList.add('hidden');
        }

        async function updateAppointment(appointmentId, values) {
            if (currentMode === 'remote') {
                const client = getSupabaseClient();
                if (!client) throw new Error('supabase-unavailable');
                const { error } = await client.from(REMOTE_TABLE).update({
                    appointment_date: values.fecha,
                    appointment_time: values.hora,
                    exams: values.examenes
                }).eq('id', Number(appointmentId));
                if (error) throw error;
            } else {
                const list = readAppointmentsLocal().map((item) =>
                    String(item.id) !== String(appointmentId) ? item : { ...item, ...values }
                );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            }
        }

        editAppointmentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const values = {
                fecha: editFecha.value,
                hora: editHora.value,
                examenes: editExamenes.value.split(',').map((e) => e.trim()).filter(Boolean)
            };

            if (!values.fecha || !values.hora || values.examenes.length === 0) {
                editModalAlert.textContent = 'Completá fecha, horario y al menos un examen.';
                editModalAlert.classList.remove('hidden');
                return;
            }
            if (!isWeekday(values.fecha)) {
                editModalAlert.textContent = 'Solo podés elegir días de lunes a viernes.';
                editModalAlert.classList.remove('hidden');
                return;
            }
            if (values.fecha < editFecha.min) {
                editModalAlert.textContent = 'La fecha no puede ser anterior a hoy.';
                editModalAlert.classList.remove('hidden');
                return;
            }

            try {
                await updateAppointment(editAppointmentId.value, values);
                closeEditModal();
                await renderAppointments();
            } catch {
                editModalAlert.textContent = 'No se pudieron guardar los cambios. Intentá nuevamente.';
                editModalAlert.classList.remove('hidden');
            }
        });

        closeEditModalButton.addEventListener('click', closeEditModal);
        cancelEditButton.addEventListener('click', closeEditModal);
        editModal.addEventListener('click', (event) => {
            if (event.target === editModal) closeEditModal();
        });

        function generateAccessCode() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }

        async function copyToClipboard(text) {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return;
            }
            const helper = document.createElement('textarea');
            helper.value = text;
            helper.setAttribute('readonly', '');
            helper.style.position = 'absolute';
            helper.style.left = '-9999px';
            document.body.appendChild(helper);
            helper.select();
            document.execCommand('copy');
            document.body.removeChild(helper);
        }

        function showCopyFeedback(message) {
            copyFeedback.textContent = message;
            copyFeedback.classList.remove('hidden');
            window.clearTimeout(showCopyFeedback.timer);
            showCopyFeedback.timer = window.setTimeout(() => {
                copyFeedback.classList.add('hidden');
            }, 1800);
        }
        showCopyFeedback.timer = null;

        function getUploadTargetAppointment() {
            return allAppointments.find((item) => String(item.id) === String(uploadTargetId)) || null;
        }

        async function handleCopyResultData(mode) {
            const appointment = getUploadTargetAppointment();
            const dni = appointment?.dni || savedResultDni.textContent.trim();
            const accessCode = savedResultAccessCode.textContent.trim();
            if (!dni || !accessCode) {
                showCopyFeedback('No hay datos para copiar.');
                return;
            }

            let text = '';
            if (mode === 'dni') text = dni;
            if (mode === 'code') text = accessCode;
            if (mode === 'both') text = `DNI: ${dni} | Clave: ${accessCode}`;

            try {
                await copyToClipboard(text);
                if (mode === 'dni') showCopyFeedback('DNI copiado.');
                if (mode === 'code') showCopyFeedback('Clave copiada.');
                if (mode === 'both') showCopyFeedback('DNI y clave copiados.');
            } catch {
                showCopyFeedback('No se pudo copiar al portapapeles.');
            }
        }

        async function saveResultUrl(appointmentId, url, notes) {
            const client = getSupabaseClient();
            if (!client) throw new Error('supabase-unavailable');
            const accessCode = generateAccessCode();
            const { error } = await client.from(RESULTS_TABLE).insert([{
                appointment_id: Number(appointmentId),
                access_code: accessCode,
                pdf_path: url,
                notes: notes || null
            }]);
            if (error) throw error;
            return { accessCode };
        }

        function viewResultPdf(pdfPath) {
            window.open(pdfPath, '_blank', 'noopener,noreferrer');
        }

        function openUploadModal(appointmentId) {
            const appointment = allAppointments.find((item) => String(item.id) === String(appointmentId));
            if (!appointment) return;
            uploadTargetId = appointmentId;
            uploadPatientName.textContent = `${appointment.nombre} ${appointment.apellido}`;
            uploadPatientDetails.textContent = `DNI ${appointment.dni} · ${formatDate(appointment.fecha)} ${appointment.hora}`;
            uploadModalAlert.classList.add('hidden');
            uploadModalSuccess.classList.add('hidden');
            uploadCredentialsBox.classList.add('hidden');
            copyFeedback.classList.add('hidden');
            savedResultDni.textContent = '';
            savedResultAccessCode.textContent = '';
            uploadForm.reset();
            uploadSubmitButton.disabled = false;
            uploadSubmitButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Guardar URL';
            uploadModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }

        function closeUploadModal() {
            uploadModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            uploadForm.reset();
            uploadTargetId = null;
            uploadModalAlert.classList.add('hidden');
            uploadModalSuccess.classList.add('hidden');
            uploadCredentialsBox.classList.add('hidden');
            copyFeedback.classList.add('hidden');
            savedResultDni.textContent = '';
            savedResultAccessCode.textContent = '';
        }

        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const url = uploadUrl.value.trim();

            if (!url) {
                uploadModalAlert.textContent = 'Ingresá una URL para el PDF.';
                uploadModalAlert.classList.remove('hidden');
                return;
            }
            try { new URL(url); } catch {
                uploadModalAlert.textContent = 'La URL ingresada no es válida.';
                uploadModalAlert.classList.remove('hidden');
                return;
            }

            uploadModalAlert.classList.add('hidden');
            uploadSubmitButton.disabled = true;
            uploadSubmitButton.textContent = 'Guardando...';

            try {
                const notes = uploadNotes.value.trim();
                const appointment = getUploadTargetAppointment();
                const resultData = await saveResultUrl(uploadTargetId, url, notes || null);
                savedResultDni.textContent = appointment?.dni || '-';
                savedResultAccessCode.textContent = resultData.accessCode;
                uploadCredentialsBox.classList.remove('hidden');
                uploadModalSuccess.textContent = 'URL guardada correctamente.';
                uploadModalSuccess.classList.remove('hidden');
                uploadSubmitButton.disabled = false;
                uploadSubmitButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Guardar otra URL';
                await renderAppointments();
            } catch (error) {
                console.error('Error guardando URL en Supabase:', error);
                uploadSubmitButton.disabled = false;
                uploadSubmitButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Guardar URL';
                const detail = error?.message ? ` Detalle: ${error.message}` : '';
                uploadModalAlert.textContent = `No se pudo guardar la URL.${detail}`;
                uploadModalAlert.classList.remove('hidden');
            }
        });

        closeUploadModalButton.addEventListener('click', closeUploadModal);
        cancelUploadButton.addEventListener('click', closeUploadModal);
        copyDniButton.addEventListener('click', () => handleCopyResultData('dni'));
        copyCodeButton.addEventListener('click', () => handleCopyResultData('code'));
        copyBothButton.addEventListener('click', () => handleCopyResultData('both'));
        uploadModal.addEventListener('click', (event) => {
            if (event.target === uploadModal) closeUploadModal();
        });

        if (isLoggedIn()) {
            showPanel();
        } else {
            showLogin();
        }
    }

    function initPageScripts() {
        bindMobileMenu();
        initScrollAnimations();
        initResultadosPage();
        initTurnosPage();
        initTurnosReservadosPage();
        initPanelPage();
    }

    redirectLegacyMainToIndex();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageScripts);
    } else {
        initPageScripts();
    }
})();

