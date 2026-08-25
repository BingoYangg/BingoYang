import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getDatabase, ref, push, set, onValue, get, update } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js';

const firebaseConfig = {
    apiKey: "AIzaSyA9jE8fu9UPZI-7UBx_Gy00cqYgmuY-ASs",
    authDomain: "bingo-yangg.firebaseapp.com",
    databaseURL: "https://bingo-yangg-default-rtdb.firebaseio.com",
    projectId: "bingo-yangg",
    storageBucket: "bingo-yangg.appspot.com",
    messagingSenderId: "978098281950",
    appId: "1:978098281950:web:3ec7eab66e2e486012114f"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const functions = getFunctions(app);

window.database = database;
window.ref = ref;
window.push = push;
window.set = set;
window.onValue = onValue;
window.get = get;
window.update = update;

let bingo75 = {
    numbers: [],
    drawnNumbers: [],
    maxNumbers: 75,
    intervalId: null,
    intervalTime: 7000,
    isAutoDrawing: false
};

let bingo90 = {
    numbers: [],
    drawnNumbers: [],
    maxNumbers: 90,
    intervalId: null,
    intervalTime: 7000,
    isAutoDrawing: false
};

let currentGame = null;
let currentGameType;

let usersBingo75 = [];
let usersBingo90 = [];
let editingUserId = null;

// Códigos de acceso
let codigoAccesoCorrectoPrincipal = ""; // Clave para el modal principal
let codigoAccesoCorrectoBingo = ""; // Clave para Bingo 75/90 y borrar usuarios

// Obtener la clave principal desde Realtime Database y mantenerla actualizada
const claveRefPrincipal = ref(database, 'config/clavePrincipal');
onValue(claveRefPrincipal, (snapshot) => {
    codigoAccesoCorrectoPrincipal = snapshot.val() || "YANG$$"; // Valor por defecto
});

// Obtener la clave de Bingo 75/90 y borrar usuarios desde Realtime Database y mantenerla actualizada
const claveRefBingo = ref(database, 'config/claveAccesoBingo');
onValue(claveRefBingo, (snapshot) => {
    codigoAccesoCorrectoBingo = snapshot.val() || "$2109"; // Valor por defecto
});

function requestAccess(type) {
    document.getElementById('initial-buttons').style.display = 'none';
    document.getElementById('access-form').style.display = 'block';
    document.getElementById('payment-info').style.display = 'none';
    currentGameType = type;

    // Establecer el tipo de acceso en el formulario
    const accessType = (type === 75 || type === 90) ? 'bingo' : 'principal';
    document.getElementById('access-form').dataset.accessType = accessType;
}

function validateAccess() {
    const accessCode = document.getElementById('password-access').value;
    const accessType = document.getElementById('access-form').dataset.accessType;

    let isValid = false;
    if (accessType === 'bingo') {
        isValid = accessCode === codigoAccesoCorrectoBingo;
    } else {
        isValid = accessCode === codigoAccesoCorrectoPrincipal;
    }

    if (isValid) {
        document.getElementById('access-form').style.display = 'none';
        startGame(currentGameType);
    } else {
        alert('Clave incorrecta. Intento fallido.');
    }
}

function cancelAccess() {
    document.getElementById('access-form').style.display = 'none';
    document.getElementById('initial-buttons').style.display = 'block';
    document.getElementById('password-access').value = '';
    document.getElementById('payment-info').style.display = 'block';
}

function startGame(type) {
    clearInterval(currentGame ? currentGame.intervalId : null);
    currentGame = type === 75 ? bingo75 : bingo90;
    currentGame.numbers = Array.from({ length: currentGame.maxNumbers }, (_, i) => i + 1);
    currentGame.drawnNumbers = [];
    document.getElementById('drawn-count').innerText = '';
    document.getElementById('large-number').innerText = '0';
    document.getElementById('large-number').style.backgroundColor = getRandomColor();
    document.getElementById('display-number').innerText = '';

    if (type === 75) {
        document.getElementById('bingo-board').innerHTML = `
            <div class="bingo-header">
                <div>B</div>
                <div>I</div>
                <div>N</div>
                <div>G</div>
                <div>O</div>
            </div>
            ${currentGame.numbers.map(num => {
                let column = '';
                if (num >= 1 && num <= 15) column = 'B';
                else if (num >= 16 && num <= 30) column = 'I';
                else if (num >= 31 && num <= 45) column = 'N';
                else if (num >= 46 && num <= 60) column = 'G';
                else column = 'O';
                return `<div class='number ${column}' id='num-${num}'>${num}</div>`;
            }).join('')}
        `;
    } else {
        document.getElementById('bingo-board').innerHTML = currentGame.numbers.map(num => {
            return `<div class='number' id='num-${num}'>${num}</div>`;
        }).join('');
    }

    document.getElementById('large-number-container').style.display = 'block';
    document.getElementById('game-buttons').style.display = 'block';
    document.getElementById('initial-buttons').style.display = 'none';
    document.getElementById('start-button').style.display = 'inline-block';
    document.getElementById('pause-button').style.display = 'none';

    document.getElementById('user-table-bingo-75-container').style.display = 'none';
    document.getElementById('user-table-bingo-90-container').style.display = 'none';

    document.getElementById('bingo-75-title').classList.add('hidden');
    document.getElementById('bingo-90-title').classList.add('hidden');

    document.getElementById('available-cards-button').style.display = 'none';

    document.getElementById('money-system-bingo-75').style.display = 'none';
    document.getElementById('money-system-bingo-90').style.display = 'none';

    document.getElementById('payment-info').style.display = 'block';

    // Ocultar las estadísticas de vendedores
    document.getElementById('seller-stats-bingo-75').style.display = 'none';
    document.getElementById('seller-stats-bingo-90').style.display = 'none';
}

function drawNumber() {
    if (currentGame.numbers.length === 0) {
        alert('Todos los números han sido sorteados');
        restartGame();
        return;
    }
    const index = Math.floor(Math.random() * currentGame.numbers.length);
    const drawn = currentGame.numbers.splice(index, 1)[0];
    currentGame.drawnNumbers.push(drawn);
    document.getElementById(`num-${drawn}`).classList.add('drawn');

    const largeNumberElement = document.getElementById('large-number');
    largeNumberElement.innerText = drawn;
    largeNumberElement.style.backgroundColor = getRandomColor();

    const drawnCount = document.getElementById('drawn-count');
    drawnCount.innerText = `Han salido ${currentGame.drawnNumbers.length} bolitas`;

    speakNumber(drawn);
    displayNumber(drawn);
}

function startAutoDraw() {
    currentGame.intervalTime = document.getElementById('interval-slider').value * 1000;
    currentGame.intervalId = setInterval(drawNumber, currentGame.intervalTime);
    document.getElementById('pause-button').style.display = 'inline-block';
    document.getElementById('start-button').style.display = 'none';
    currentGame.isAutoDrawing = true;
}

function pauseAutoDraw() {
    clearInterval(currentGame.intervalId);
    document.getElementById('pause-button').style.display = 'none';
    document.getElementById('start-button').style.display = 'inline-block';
    currentGame.isAutoDrawing = false;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function speakNumber(number) {
    if (currentGame.isAutoDrawing) {
        let speechText = `${number}`;
        if (currentGame.maxNumbers === 75) {
            if (number >= 1 && number <= 15) speechText = `B ${number}`;
            else if (number >= 16 && number <= 30) speechText = `I ${number}`;
            else if (number >= 31 && number <= 45) speechText = `N ${number}`;
            else if (number >= 46 && number <= 60) speechText = `G ${number}`;
            else speechText = `O ${number}`;
        }
        let speech = new SpeechSynthesisUtterance(speechText);
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang === 'es-ES');
        if (spanishVoice) {
            speech.voice = spanishVoice;
        } else {
            speech.lang = 'es-ES';
        }
        speech.pitch = 1;
        speech.rate = 1;
        speech.volume = 1;
        window.speechSynthesis.speak(speech);
    }
}

function displayNumber(number) {
    const displayElement = document.getElementById('display-number');
    let displayText = `${number}`;
    if (currentGame.maxNumbers === 75) {
        if (number >= 1 && number <= 15) displayText = `B ${number}`;
        else if (number >= 16 && number <= 30) displayText = `I ${number}`;
        else if (number >= 31 && number <= 45) displayText = `N ${number}`;
        else if (number >= 46 && number <= 60) displayText = `G ${number}`;
        else displayText = `O ${number}`;
    }
    displayElement.innerText = displayText;
}

function restartGame() {
    document.getElementById('bingo-alert').style.display = 'none';
    startGame(currentGame.maxNumbers === 75 ? 75 : 90);
}

function goBack() {
    clearInterval(currentGame.intervalId);
    document.getElementById('game-buttons').style.display = 'none';
    document.getElementById('initial-buttons').style.display = 'block';
    document.getElementById('large-number-container').style.display = 'none';
    document.getElementById('bingo-board').innerHTML = '';

    document.getElementById('user-table-bingo-75-container').style.display = 'block';
    document.getElementById('user-table-bingo-90-container').style.display = 'block';

    document.getElementById('bingo-75-title').classList.remove('hidden');
    document.getElementById('bingo-90-title').classList.remove('hidden');

    document.getElementById('available-cards-button').style.display = 'block';

    document.getElementById('money-system-bingo-75').style.display = 'block';
    document.getElementById('money-system-bingo-90').style.display = 'block';

    document.getElementById('payment-info').style.display = 'block';

    // Mostrar las estadísticas de vendedores
    document.getElementById('seller-stats-bingo-75').style.display = 'block';
    document.getElementById('seller-stats-bingo-90').style.display = 'block';
}

function checkBingo() {
    document.getElementById('bingo-alert').style.display = 'block';
}

function mostrarCarton() {
    const id = parseInt(document.getElementById('carton-id').value);
    const paddedId = id.toString().padStart(currentGame.maxNumbers === 75 ? 3 : 6, '0');
    const rutaImagen = `images/${paddedId}.JPG`;
    const imagen = new Image();
    imagen.src = rutaImagen;
    imagen.alt = `Cartón ${id}`;
    imagen.onload = function() {
        const cartonImageContainer = document.getElementById('carton-image-container');
        cartonImageContainer.innerHTML = '';
        cartonImageContainer.appendChild(imagen);
    };
    imagen.onerror = function() {
        const cartonImageContainer = document.getElementById('carton-image-container');
        cartonImageContainer.innerHTML = 'Error al cargar la imagen.';
    };
}

function verificarCarton() {
    const id = parseInt(document.getElementById('carton-id').value);
    const resultado = document.getElementById('resultado-verificacion');
    const cartonImageContainer = document.getElementById('carton-image-container');

    if (!isNaN(id)) {
        const paddedId = id.toString().padStart(currentGame.maxNumbers === 75 ? 3 : 6, '0');
        const validCartonNumbers = currentGame.maxNumbers === 75 ? validCartonNumbersBingo75 : validCartonNumbersBingo90;

        if (validCartonNumbers.includes(paddedId)) {
            const usersRef = ref(database, `users/${currentGame.maxNumbers === 75 ? 'bingo-75' : 'bingo-90'}`);
            get(usersRef)
                .then((snapshot) => {
                    const users = snapshot.val();
                    if (users) {
                        const cartonExists = Object.values(users).some(user =>
                            user.cartonNumbers.split(',').map(num => num.trim()).includes(paddedId)
                        );
                        if (cartonExists) {
                            document.getElementById('duplicate-message').innerText = `El número de cartón ${id} ya fue vendido.`;
                            document.getElementById('duplicate-alert').style.display = 'block';
                            return;
                        }
                    } else {
                        showErrorAlert('No hay usuarios registrados.');
                    }
                    mostrarCarton(id);
                    resultado.innerText = 'Imagen del cartón cargada.';
                })
                .catch((error) => {
                    console.error('Error al verificar el cartón:', error);
                    showErrorAlert('Error al verificar el cartón.');
                });
        } else {
            resultado.innerText = 'Número de cartón no válido.';
            cartonImageContainer.innerHTML = '';
        }
    } else {
        resultado.innerText = 'Ingrese un número válido.';
        cartonImageContainer.innerHTML = '';
    }
}

function borrarCarton() {
    const cartonImageContainer = document.getElementById('carton-image-container');
    const resultado = document.getElementById('resultado-verificacion');
    document.getElementById('carton-id').value = '';
    cartonImageContainer.innerHTML = '';
    resultado.innerText = '';
}

function togglePaymentReference(gameType) {
    const paymentType = document.getElementById(`payment-${gameType}`).value;
    const paymentReference = document.getElementById(`payment-reference-${gameType}`);
    if (paymentType === 'dolar') {
        paymentReference.style.display = 'none';
    } else {
        paymentReference.style.display = 'block';
    }

    // Guardar la opción de BS seleccionada en Realtime Database
    const configRef = ref(database, `config/${gameType}`);
    update(configRef, { selectedMoneyAmount: document.getElementById(`money-amount-${gameType}`).value });
}

function handleImageUpload(gameType) {
    const input = document.getElementById(`upload-${gameType}`);
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result; // La imagen en Base64
            const imagePreview = document.getElementById(`image-preview-${gameType}`);
            imagePreview.src = base64Image;
            imagePreview.style.display = 'block';
        };
        reader.onerror = function(error) {
            console.error("Error al leer el archivo:", error);
            alert("Error al leer la imagen. Por favor, inténtalo de nuevo.");
        };
        reader.readAsDataURL(file); // Lee el archivo como una URL de datos (Base64)
    }
}

function showImagePreview(imageUrl) {
    const previewContainer = document.createElement('div');
    previewContainer.classList.add('image-preview');

    const previewImage = new Image();
    previewImage.src = imageUrl;
    previewImage.style.maxWidth = '100%';
    previewImage.style.height = 'auto';

    const closeButton = document.createElement('button');
    closeButton.innerText = 'Cerrar';
    closeButton.onclick = function() {
        document.body.removeChild(previewContainer);
    };

    previewContainer.appendChild(previewImage);
    previewContainer.appendChild(closeButton);
    document.body.appendChild(previewContainer);
}

function clearUserForm(gameType) {
    document.getElementById(`name-${gameType}`).value = '';
    document.getElementById(`id-${gameType}`).value = '';
    document.getElementById(`payment-${gameType}`).value = 'referencia';
    document.getElementById(`payment-reference-${gameType}`).value = '';
    document.getElementById(`carton-numbers-${gameType}`).value = '';
    document.getElementById(`vendedor-${gameType}`).value = '';
    document.getElementById(`phone-${gameType}`).value = '';
    document.getElementById(`image-preview-${gameType}`).src = '';
    document.getElementById(`image-preview-${gameType}`).style.display = 'none';
}

function isFieldEmpty(value) {
    return value.trim() === '';
}

function isValidName(value) {
    return /^[A-Za-z\s]+$/.test(value); // Solo letras y espacios
}

function isValidPhoneNumber(value) {
    return /^[0-9]+$/.test(value); // Solo números
}

function isValidId(value) {
    return /^[0-9]+$/.test(value); // Solo números
}

function isValidReference(value) {
    return /^[0-9]{5}$/.test(value); // Exactamente 5 números
}

function isImageUploaded(gameType) {
    const imagePreview = document.getElementById(`image-preview-${gameType}`);
    return imagePreview.src !== '';
}

function validateCartonNumbers(gameType, cartonNumbers) {
    const validNumbers = gameType === 'bingo-75' ? validCartonNumbersBingo75 : validCartonNumbersBingo90;
    const numbersArray = cartonNumbers.split(',').map(num => num.trim());

    // Validación 1: Todos los números deben ser válidos
    const allNumbersAreValid = numbersArray.every(number => validNumbers.includes(number));
    if (!allNumbersAreValid) {
        return { valid: false, message: 'Uno o más números de cartón no son válidos.' };
    }

    // Validación 2: No debe haber números repetidos en el mismo campo
    const hasDuplicates = numbersArray.some((number, index) => numbersArray.indexOf(number) !== index);
    if (hasDuplicates) {
        return { valid: false, message: 'Hay números de cartón repetidos en el mismo campo.' };
    }

    return { valid: true };
}

function showErrorAlert(message) {
    const alertBox = document.getElementById('error-alert');
    const errorMessage = document.getElementById('error-message');
    errorMessage.innerText = message;
    alertBox.style.display = 'block';

    // Ocultar la alerta después de 3 segundos
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 3000);
}

function showSuccessAlert(message) {
    const alertBox = document.getElementById('success-alert');
    const successMessage = document.getElementById('success-message');
    successMessage.innerText = message;
    alertBox.style.display = 'block';

    // Ocultar la alerta después de 3 segundos
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 3000);
}

function addUser(gameType) {
    const name = document.getElementById(`name-${gameType}`).value;
    const id = document.getElementById(`id-${gameType}`).value;
    const paymentType = document.getElementById(`payment-${gameType}`).value;
    const paymentReference = document.getElementById(`payment-reference-${gameType}`).value;
    const cartonNumbers = document.getElementById(`carton-numbers-${gameType}`).value;
    const vendedor = document.getElementById(`vendedor-${gameType}`).value;
    const phone = document.getElementById(`phone-${gameType}`).value;
    const date = `${document.getElementById(`date-${gameType}-day`).value}-${document.getElementById(`date-${gameType}-month`).value}`;

    // Validación de campos vacíos
    if (isFieldEmpty(name) || isFieldEmpty(id) || isFieldEmpty(cartonNumbers) || isFieldEmpty(vendedor) || isFieldEmpty(phone)) {
        showErrorAlert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    // Validación de formato del vendedor
    if (!isValidName(vendedor)) {
        showErrorAlert('El campo Vendedor solo permite letras.');
        return;
    }

    // Validación de formato del nombre de usuario
    if (!isValidName(name)) {
        showErrorAlert('El campo Usuario solo permite letras.');
        return;
    }

    // Validación de formato del número de teléfono
    if (!isValidPhoneNumber(phone)) {
        showErrorAlert('El campo Teléfono solo permite números.');
        return;
    }

    // Validación de formato de la cédula
    if (!isValidId(id)) {
        showErrorAlert('El campo Cédula solo permite números.');
        return;
    }

    // Validación de formato de la referencia
    if (paymentType === 'referencia' && !isValidReference(paymentReference)) {
        showErrorAlert('El campo Referencia debe contener 5 números.');
        return;
    }

    // Validación de si se subió la foto
    if (!isImageUploaded(gameType)) {
        showErrorAlert('Por favor, suba la foto.');
        return;
    }

    // Validar los números de cartón
    const validationResult = validateCartonNumbers(gameType, cartonNumbers);
    if (!validationResult.valid) {
        showErrorAlert(validationResult.message);
        return;
    }

    const usersRef = ref(database, `users/${gameType}`);
    get(usersRef)
        .then((snapshot) => {
            const users = snapshot.val();
            const numbersArray = cartonNumbers.split(',').map(num => num.trim());
            let alreadySold = false;

            if (users) {
                // Validar si algún número ya fue vendido
                for (const userId in users) {
                    const user = users[userId];
                    const userCartonNumbers = user.cartonNumbers.split(',').map(num => num.trim());

                    if (numbersArray.some(num => userCartonNumbers.includes(num))) {
                        alreadySold = true;
                        break;
                    }
                }

                if (alreadySold) {
                    showErrorAlert(`Uno o más números de cartón ya fueron vendidos, por favor cambie por otro.`);
                    return;
                }
            }

            const newUserRef = push(usersRef);

            const base64Image = document.getElementById(`image-preview-${gameType}`).src; // Obtiene la imagen en Base64 desde el elemento de vista previa

            set(newUserRef, {
                name: name,
                id: id,
                paymentType: paymentType,
                paymentReference: paymentReference,
                cartonNumbers: cartonNumbers,
                vendedor: vendedor,
                phone: phone,
                date: date,
                imageUrl: base64Image, // Guarda la imagen en Base64
                verified: false
            })
                .then(() => {
                    showSuccessAlert('Usuario añadido exitosamente.');
                    clearUserForm(gameType);
                    renderUserTable(gameType);
                    updateSellerStats(gameType, vendedor, cartonNumbers);
                    updateTotalMoney(gameType);
                    updateTotalCartonsSold(); // Llama a la función updateTotalCartonsSold aquí
                })
                .catch((error) => {
                    console.error('Error al añadir el usuario:', error);
                    showErrorAlert('Error al añadir el usuario: ' + error.message);
                });
        })
        .catch((error) => {
            console.error('Error al obtener la lista de usuarios:', error);
            showErrorAlert('Error al obtener la lista de usuarios: ' + error.message);
        });
}

function toggleVerification(userId, gameType) {
    const userRef = ref(database, `users/${gameType}/${userId}`);

    get(userRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const user = snapshot.val();
                const verified = user.verified || false;

                const newVerificationStatus = !verified;

                update(userRef, { verified: newVerificationStatus })
                    .then(() => {
                        console.log(`Estado de verificación actualizado para el usuario ${userId} en ${gameType} a ${newVerificationStatus}`);
                        renderUserTable(gameType);
                        updateTotalMoney(gameType); // Llama a la función updateTotalMoney aquí
                    })
                    .catch((error) => {
                        console.error('Error al actualizar el estado de verificación:', error);
                    });
            } else {
                console.log("No data available");
            }
        })
        .catch((error) => {
            console.error("Error getting data:", error);
        });
}

function clearUsersBingo75() {
    requestDeleteAccess('bingo-75');
}

function clearUsersBingo90() {
    requestDeleteAccess('bingo-90');
}

function requestDeleteAccess(gameType) {
    document.getElementById('delete-access-form').style.display = 'block';
    document.getElementById('password-delete').value = '';
    currentGameType = gameType;
}

function cancelDeleteAccess() {
    document.getElementById('delete-access-form').style.display = 'none';
    currentGameType = null;
}

function validateDeleteAccess() {
    const accessCode = document.getElementById('password-delete').value;
    if (accessCode === codigoAccesoCorrectoBingo) { // Cambiamos la contraseña aquí
        document.getElementById('delete-access-form').style.display = 'none';
        if (currentGameType === 'bingo-75') {
            const usersRef = ref(database, 'users/bingo-75');
            set(usersRef, {})
                .then(() => {
                    renderUserTable('bingo-75');
                    document.getElementById('total-money-bingo-75').innerText = 'BS: ****';
                    document.getElementById('total-money-bingo-75').setAttribute('data-money', '0');
                    // Borrar las estadísticas de los vendedores para Bingo 75
                    clearSellerStats('bingo-75');
                })
                .catch((error) => {
                    console.error('Error al borrar los usuarios:', error);
                });
        } else if (currentGameType === 'bingo-90') {
            const usersRef = ref(database, 'users/bingo-90');
            set(usersRef, {})
                .then(() => {
                    renderUserTable('bingo-90');
                    document.getElementById('total-money-bingo-90').innerText = 'BS: ****';
                    document.getElementById('total-money-bingo-90').setAttribute('data-money', '0');
                    // Borrar las estadísticas de los vendedores para Bingo 90
                    clearSellerStats('bingo-90');
                })
                .catch((error) => {
                    console.error('Error al borrar los usuarios:', error);
                });
        }

        updateTotalCartonsSold(); // Llama a la función updateTotalCartonsSold aquí
    } else {
        alert('Clave incorrecta. Intento fallido.');
    }
}

function updateTotalMoney(gameType) {
    const usersRef = ref(database, `users/${gameType}`);
    const moneyAmountSelect = document.getElementById(`money-amount-${gameType}`);
    const moneyAmount = parseInt(moneyAmountSelect.value);

    get(usersRef)
        .then((snapshot) => {
            const users = snapshot.val();
            let totalMoney = 0;

            if (users) {
                for (const userId in users) {
                    const user = users[userId];
                    if (user.verified) {
                        const cartonNumbers = user.cartonNumbers.split(',').map(num => num.trim());
                        totalMoney += cartonNumbers.length * moneyAmount;
                    }
                }
            }

            document.getElementById(`total-money-${gameType}`).innerText = `BS: ${totalMoney}`;
            document.getElementById(`total-money-${gameType}`).setAttribute('data-money', totalMoney);
        })
        .catch((error) => {
            console.error('Error al obtener la lista de usuarios:', error);
            showErrorAlert('Error al obtener la lista de usuarios para calcular el total de dinero: ' + error.message);
        });
}

function updateSellerStats(gameType, sellerName, cartonNumbers) {
    const sellerStatsRef = ref(database, `sellerStats/${gameType}/${sellerName}`);
    const cartonCount = cartonNumbers.split(',').length;

    // Obtener el contador actual del vendedor desde Realtime Database
    get(sellerStatsRef)
        .then((snapshot) => {
            const currentStats = snapshot.val() || 0;
            const newStats = currentStats + cartonCount;

            // Guardar el nuevo contador en Realtime Database
            set(sellerStatsRef, newStats)
                .then(() => {
                    console.log(`Estadísticas de ${sellerName} en ${gameType} actualizadas a ${newStats}`);
                })
                .catch((error) => {
                    console.error('Error al guardar las estadísticas en Realtime Database:', error);
                });
        })
        .catch((error) => {
            console.error('Error al obtener las estadísticas desde Realtime Database:', error);
        });
}

function clearSellerStats(gameType) {
    const sellerStatsRef = ref(database, `sellerStats/${gameType}`);
    set(sellerStatsRef, null) // Usamos null para borrar el nodo
        .then(() => {
            console.log(`Estadísticas de vendedores para ${gameType} borradas.`);
        })
        .catch((error) => {
            console.error('Error al borrar las estadísticas de vendedores:', error);
        });
}

function updateSellerStatsDisplay(gameType) {
    const sellerStatsElement = document.getElementById(`seller-stats-${gameType}`);
    const sellerStatsRef = ref(database, `sellerStats/${gameType}`);

    // Escuchar los cambios en las estadísticas de vendedores
    onValue(sellerStatsRef, (snapshot) => {
        const stats = snapshot.val() || {};
        let statsHTML = '';
        for (const sellerName in stats) {
            if (stats.hasOwnProperty(sellerName)) {
                statsHTML += `<p>${sellerName}: ${stats[sellerName]} cartones vendidos</p>`;
            }
        }
        sellerStatsElement.innerHTML = statsHTML;
    });
}

function loadDataFromDatabase(gameType) {
    const configRef = ref(database, `config/${gameType}`);

    onValue(configRef, (snapshot) => {
        const config = snapshot.val();
        if (config) {
            // Cargar la opción de BS seleccionada
            if (config.selectedMoneyAmount) {
                document.getElementById(`money-amount-${gameType}`).value = config.selectedMoneyAmount;
            }

            // Cargar el total de dinero
            if (config.totalMoney) {
                const totalMoneyElement = document.getElementById(`total-money-${gameType}`);
                totalMoneyElement.innerText = `BS: ****`;
                totalMoneyElement.setAttribute('data-money', config.totalMoney);
            }
        }
    });
}

function loadSelectedMoneyAmount(gameType) {
    const configRef = ref(database, `config/${gameType}`);

    get(configRef)
        .then((snapshot) => {
            const config = snapshot.val();
            if (config && config.selectedMoneyAmount) {
                document.getElementById(`money-amount-${gameType}`).value = config.selectedMoneyAmount;
            }
        })
        .catch((error) => {
            console.error('Error al cargar la cantidad de dinero seleccionada:', error);
        });
}

function renderUserTable(gameType) {
    const tableBody = document.getElementById(`user-table-body-${gameType}`);
    const cardContainer = document.getElementById(`user-cards-${gameType}`);
    tableBody.innerHTML = '';
    cardContainer.innerHTML = '';

    const usersRef = ref(database, `users/${gameType}`);

    // Escuchar los cambios en la base de datos
    onValue(usersRef, (snapshot) => {
        const users = snapshot.val();
        if (users) {
            Object.keys(users).forEach((userId) => {
                const user = users[userId];

                let imageHtml = '';
                if (user.imageUrl) {
                    imageHtml = `<img src="${user.imageUrl}" alt="Imagen de usuario" class="thumbnail" onclick="appFunctions.showImagePreview('${user.imageUrl}')">`;
                } else {
                    imageHtml = 'No hay imagen disponible'; // o puedes usar una imagen por defecto
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Fecha">${user.date}</td>
                    <td data-label="Vendedor">${user.vendedor}</td>
                    <td data-label="Usuario">${user.name}</td>
                    <td data-label="Cédula">${user.id}</td>
                    <td data-label="Teléfono">${user.phone}</td>
                    <td data-label="Referencia/Dólar">${user.paymentType === 'referencia' ? user.paymentReference : 'Dólar'}</td>
                    <td>${imageHtml}</td>
                    <td data-label="Números de Cartón">${user.cartonNumbers}</td>
                    <td onclick="appFunctions.toggleVerification('${userId}', '${gameType}')" style="cursor: pointer;">${user.verified ? '✅' : '❌'}</td>
                `;
                tableBody.appendChild(row);

                const card = document.createElement('div');
                card.classList.add('card');
                card.innerHTML = `
                    <h3 class="card-name">${user.name}</h3>
                    <p><strong>Fecha:</strong> ${user.date}</p>
                    <p><strong>Vendedor:</strong> ${user.vendedor}</p>
                    <p><strong>Cédula:</strong> ${user.id}</p>
                    <p><strong>Teléfono:</strong> ${user.phone}</p>
                    <p><strong>Referencia/Dólar:</strong> ${user.paymentType === 'referencia' ? user.paymentReference : 'Dólar'}</p>
                    <p><strong>Números de Cartón:</strong> ${user.cartonNumbers}</p>
                    ${imageHtml}
                    <p class="card-verification">${user.verified ? '✅' : '❌'}</p>
                `;
                cardContainer.appendChild(card);
            });

            // Después de cargar los usuarios, actualiza las estadísticas del vendedor
            updateSellerStatsDisplay(gameType);
        } else {
            tableBody.innerHTML = '<tr><td colspan="10">No hay usuarios registrados.</td></tr>';
            cardContainer.innerHTML = '';
        }

        // Después de cargar los usuarios, actualiza las estadísticas del vendedor
        updateSellerStatsDisplay(gameType);
    });
}

function updateTotalCartonsSold() {
    const totalCartonsSold = document.querySelectorAll('#user-table-body-bingo-75 tr').length + document.querySelectorAll('#user-table-body-bingo-90 tr').length;
    const remainingCartons = 600 - totalCartonsSold;
    document.getElementById('total-cartons-sold').innerText = `Total de cartones vendidos: ${totalCartonsSold}`;
    document.getElementById('remaining-cartons').innerText = `Cartones restantes: ${remainingCartons}`;
}

// Al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    renderUserTable('bingo-75');
    renderUserTable('bingo-90');

    loadDataFromDatabase('bingo-75');
    loadDataFromDatabase('bingo-90');

    loadSelectedMoneyAmount('bingo-75'); // Llama a la función después de que se defina
    loadSelectedMoneyAmount('bingo-90'); // Llama a la función después de que se defina
});

document.getElementById('duplicate-ok').addEventListener('click', function() {
    document.getElementById('duplicate-alert').style.display = 'none';
});

document.getElementById('error-ok').addEventListener('click', function() {
    document.getElementById('error-alert').style.display = 'none';
});

document.getElementById('success-ok').addEventListener('click', function() {
    document.getElementById('success-alert').style.display = 'none';
});

document.getElementById('available-cards-button').addEventListener('click', function() {
    window.location.href = 'cartones-disponibles.html';
});

const validCartonNumbersBingo75 = [
    "001", "002", "003", "004", "005", "006", "007", "008", "009", "010",
    "011", "012", "013", "014", "015", "016", "017", "018", "019", "020",
    "021", "022", "023", "024", "025", "026", "027", "028", "029", "030",
    "031", "032", "033", "034", "035", "036", "037", "038", "039", "040",
    "041", "042", "043", "044", "045", "046", "047", "048", "049", "050",
    "051", "052", "053", "054", "055", "056", "057", "058", "059", "060",
    "061", "062", "063", "064", "065", "066", "067", "068", "069", "070",
    "071", "072", "073", "074", "075", "076", "077", "078", "079", "080",
    "076", "077", "078", "079", "080",
    "081", "082", "083", "084", "085", "086", "087", "088", "089", "090",
    "091", "092", "093", "094", "095", "096", "097", "098", "099", "100",
    "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
    "111", "112", "113", "114", "115", "116", "117", "118", "119", "120",
    "121", "122", "123", "124", "125", "126", "127", "128", "129", "130",
    "131", "132", "133", "134", "135", "136", "137", "138", "139", "140",
    "141", "142", "143", "144", "145", "146", "147", "148", "149", "150",
    "151", "152", "153", "154", "155", "156", "157", "158", "159", "160",
    "161", "162", "163", "164", "165", "166", "167", "168", "169", "170",
    "161", "162", "163", "164", "165", "166", "167", "168", "169", "170",
    "171", "172", "173", "174", "175", "176", "177", "178", "179", "180",
    "181", "182", "183", "184", "185", "186", "187", "188", "189", "190",
    "191", "192", "193", "194", "195", "196", "197", "198", "199", "200",
    "201", "202", "203", "204", "205", "206", "207", "208", "209", "210",
    "211", "212", "213", "214", "215", "216", "217", "218", "219", "220",
    "221", "222", "223", "224", "225", "226", "227", "228", "229", "230",
    "231", "232", "233", "234", "235", "236", "237", "238", "239", "240",
    "241", "242", "243", "244", "245", "246", "247", "248", "249", "250",
    "251", "252", "253", "254", "255", "256", "257", "258", "259", "260",
    "261", "262", "263", "264", "265", "266", "267", "268", "269", "270",
    "261", "262", "263", "264", "265", "266", "267", "268", "269", "270",
    "271", "272", "273", "274", "275", "276", "277", "278", "279", "280",
    "281", "282", "283", "284", "285", "286", "287", "288", "289", "290",
    "291", "292", "293", "294", "295", "296", "297", "298", "299", "300",
    "301", "302", "303", "304", "305", "306", "307", "308", "309", "310",
    "311", "312", "313", "314", "315", "316", "317", "318", "319", "320",
    "321", "322", "323", "324", "325", "326", "327", "328", "329", "330",
    "331", "332", "333", "334", "335", "336", "337", "338", "339", "340",
    "341", "342", "343", "344", "345", "346", "347", "348", "349", "350",
    "351", "352", "353", "354", "355", "356", "357", "358", "359", "360",
    "361", "362", "363", "364", "365", "366", "367", "368", "369", "370",
    "361", "362", "363", "364", "365", "366", "367", "368", "369", "370",
    "371", "372", "373", "374", "375", "376", "377", "378", "379", "380",
    "381", "382", "383", "384", "385", "386", "387", "388", "389", "390",
    "391", "392", "393", "394", "395", "396", "397", "398", "399", "400",
    "401", "402", "403", "404", "405", "406", "407", "408", "409", "410",
    "411", "412", "413", "414", "415", "416", "417", "418", "419", "420",
    "421", "422", "423", "424", "425", "426", "427", "428", "429", "430",
    "431", "432", "433", "434", "435", "436", "437", "438", "439", "440",
    "441", "442", "443", "444", "445", "446", "447", "448", "449", "450",
    "451", "452", "453", "454", "455", "456", "457", "458", "459", "460",
    "461", "462", "463", "464", "465", "466", "467", "468", "469", "470",
    "471", "472", "473", "474", "475", "476", "477", "478", "479", "480",
    "481", "482", "483", "484", "485", "486", "487", "488", "489", "490",
    "491", "492", "493", "494", "495", "496", "497", "498", "499", "500",
    "501", "502", "503", "504", "505", "506", "507", "508", "509", "510",
    "511", "512", "513", "514", "515", "516", "517", "518", "519", "520",
    "521", "522", "523", "524", "525", "526", "527", "528", "529", "530",
    "531", "532", "533", "534", "535", "536", "537", "538", "539", "540",
    "541", "542", "543", "544", "545", "546", "547", "548", "549", "550",
    "551", "552", "553", "554", "555", "556", "557", "558", "559", "560",
    "561", "562", "563", "564", "565", "566", "567", "568", "569", "570",
    "571", "572", "573", "574", "575", "576", "577", "578", "579", "580",
    "581", "582", "583", "584", "585", "586", "587", "588", "589", "590",
    "591", "592", "593", "594", "595", "596", "597", "598", "599", "600"
];

const validCartonNumbersBingo90 = [
    "001001", "001002", "001003", "001004", "001005", "001006",
    "002001", "002002", "002003", "002004", "002005", "002006",
    "003001", "003002", "003003", "003004", "003005", "003006",
    "004001", "004002", "004003", "004004", "004005", "004006",
    "005001", "005002", "005003", "005004", "005005", "005006",
    "006001", "006002", "006003", "006004", "006005", "006006",
    "007001", "007002", "007003", "007004", "007005", "007006",
    "008001", "008002", "008003", "008004", "008005", "008006",
    "009001", "009002", "009003", "009004", "009005", "009006",
    "010001", "010002", "010003", "010004", "010005", "010006",
    "011001", "011002", "011003", "011004", "011005", "011006",
    "012001", "012002", "012003", "012004", "012005", "012006",
    "013001", "013002", "013003", "013004", "013005", "013006",
    "014001", "014002", "014003", "014004", "014005", "014006",
    "015001", "015002", "015003", "015004", "015005", "015006",
    "016001", "016002", "016003", "016004", "016005", "016006",
    "017001", "017002", "017003", "017004", "017005", "017006",
    "018001", "018002", "018003", "018004", "018005", "018006",
    "019001", "019002", "019003", "019004", "019005", "019006",
    "020001", "020002", "020003", "020004", "020005", "020006",
    "021001", "021002", "021003", "021004", "021005", "021006",
    "022001", "022002", "022003", "022004", "022005", "022006",
    "023001", "023002", "023003", "023004", "023005", "023006",
    "024001", "024002", "024003", "024004", "024005", "024006",
    "025001", "025002", "025003", "025004", "025005", "025006",
    "026001", "026002", "026003", "026004", "026005", "026006",
    "027001", "027002", "027003", "027004", "027005", "027006",
    "028001", "028002", "028003", "028004", "028005", "028006",
    "029001", "029002", "029003", "029004", "029005", "029006",
    "030001", "030002", "030003", "030004", "030005", "030006",
    "031001", "031002", "031003", "031004", "031005", "031006",
    "032001", "032002", "032003", "032004", "032005", "032006",
    "033001", "033002", "033003", "033004", "033005", "033006",
    "034001", "034002", "034003", "034004", "034005", "034006",
    "035001", "035002", "035003", "035004", "035005", "035006",
    "036001", "036002", "036003", "036004", "036005", "036006",
    "037001", "037002", "037003", "037004", "037005", "037006",
    "038001", "038002", "038003", "038004", "038005", "038006",
    "039001", "039002", "039003", "039004", "039005", "039006",
    "040001", "040002", "040003", "040004", "040005", "040006",
    "041001", "041002", "041003", "041004", "041005", "041006",
    "042001", "042002", "042003", "042004", "042005", "042006",
    "043001", "043002", "043003", "043004", "043005", "043006",
    "044001", "044002", "044003", "044004", "044005", "044006",
    "045001", "045002", "045003", "045004", "045005", "045006",
    "046001", "046002", "046003", "046004", "046005", "046006",
    "047001", "047002", "047003", "047004", "047005", "047006",
    "048001", "048002", "048003", "048004", "048005", "048006",
    "049001", "049002", "049003", "049004", "049005", "049006",
    "050001", "050002", "050003", "050004", "050005", "050006",
    "051001", "051002", "051003", "051004", "051005", "051006",
    "052001", "052002", "052003", "052004", "052005", "052006",
    "053001", "053002", "053003", "053004", "053005", "053006",
    "054001", "054002", "054003", "054004", "054005", "054006",
    "055001", "055002", "055003", "055004", "055005", "055006",
    "056001", "056002", "056003", "056004", "056005", "056006",
    "057001", "057002", "057003", "057004", "057005", "057006",
    "058001", "058002", "058003", "058004", "058005", "058006",
    "059001", "059002", "059003", "059004", "059005", "059006",
    "060001", "060002", "060003", "060004", "060005", "060006",
    "061001", "061002", "061003", "061004", "061005", "061006",
    "062001", "062002", "062003", "062004", "062005", "062006",
    "063001", "063002", "063003", "063004", "063005", "063006",
    "064001", "064002", "064003", "064004", "064005", "064006",
    "065001", "065002", "065003", "065004", "065005", "065006",
    "066001", "066002", "066003", "066004", "066005", "066006",
    "067001", "067002", "067003", "067004", "067005", "067006",
    "068001", "068002", "068003", "068004", "068005", "068006",
    "069001", "069002", "069003", "069004", "069005", "069006",
    "070001", "070002", "070003", "070004", "070005", "070006",
    "071001", "071002", "071003", "071004", "071005", "071006",
    "072001", "072002", "072003", "072004", "072005", "072006",
    "073001", "073002", "073003", "073004", "073005", "073006",
    "074001", "074002", "074003", "074004", "074005", "074006",
    "075001", "075002", "075003", "075004", "075005", "075006",
    "076001", "076002", "076003", "076004", "076005", "076006",
    "077001", "077002", "077003", "077004", "077005", "077006",
    "078001", "078002", "078003", "078004", "078005", "078006",
    "079001", "079002", "079003", "079004", "079005", "079006",
    "080001", "080002", "080003", "080004", "080005", "080006",
    "081001", "081002", "081003", "081004", "081005", "081006",
    "082001", "082002", "082003", "082004", "082005", "082006",
    "083001", "083002", "083003", "083004", "083005", "083006",
    "084001", "084002", "084003", "084004", "084005", "084006",
    "085001", "085002", "085003", "085004", "085005", "085006",
    "086001", "086002", "086003", "086004", "086005", "086006",
    "087001", "087002", "087003", "087004", "087005", "087006",
    "088001", "088002", "088003", "088004", "088005", "088006",
    "089001", "089002", "089003", "089004", "089005", "089006",
    "090001", "090002", "090003", "090004", "090005", "090006",
    "091001", "091002", "091003", "091004", "091005", "091006",
    "092001", "092002", "092003", "092004", "092005", "092006",
    "093001", "093002", "093003", "093004", "093005", "093006",
    "094001", "094002", "094003", "094004", "094005", "094006",
    "095001", "095002", "095003", "095004", "095005", "095006",
    "096001", "096002", "096003", "096004", "096005", "096006",
    "097001", "097002", "097003", "097004", "097005", "097006",
    "098001", "098002", "098003", "098004", "098005", "098006",
    "099001", "099002", "099003", "099004", "099005", "099006",
    "100001", "100002", "100003", "100004", "100005", "100006"
];

// Código de acceso (¡cámbialo!)
let codigoAccesoCorrecto = "";

// Elementos del modal
const modal = document.getElementById("accesoModal");
const codigoInput = document.getElementById("codigo-acceso");
const botonEnviar = document.getElementById("boton-enviar-codigo");
const mensajeError = document.getElementById("mensaje-error");

let accesoPermitido = false; // Variable para controlar si el acceso está permitido

// Función para mostrar el modal
function mostrarModalAcceso() {
    modal.style.display = "flex";
}

// Función para ocultar el modal
function ocultarModalAcceso() {
    modal.style.display = "none";
}

// Función para manejar el envío del código de acceso
function manejarEnvioCodigoAcceso() {
    const codigoIngresado = codigoInput.value;

    if (codigoIngresado === codigoAccesoCorrecto) {
        // El código es correcto, permitir el acceso
        accesoPermitido = true;
        ocultarModalAcceso();
        mensajeError.style.display = "none";

        // Aquí puedes agregar código para mostrar el contenido de tu página
        // Por ejemplo, puedes mostrar los botones del juego:
        // document.getElementById("game-buttons").style.display = "block";
    } else {
        // El código es incorrecto, mostrar un mensaje de error
        mensajeError.style.display = "block";
        accesoPermitido = false;
    }
}

// Al cargar la página
window.onload = function() {
    // Mostrar el modal de acceso
    mostrarModalAcceso();

    // Asignar el evento al botón de envío del código de acceso
    botonEnviar.onclick = manejarEnvioCodigoAcceso;

    // Obtener la clave principal desde Realtime Database y mantenerla actualizada
    const claveRefPrincipal = ref(database, 'config/clavePrincipal');
    onValue(claveRefPrincipal, (snapshot) => {
        codigoAccesoCorrecto = snapshot.val() || "                                      "; // Valor por defecto
    });

    // Llamar a la función updateTotalMoney al cargar la página
    updateTotalMoney('bingo-75');
    updateTotalMoney('bingo-90');
};

// Crear el objeto appFunctions y adjuntarlo al objeto window
window.appFunctions = {
    requestAccess: requestAccess,
    validateAccess: validateAccess,
    cancelAccess: cancelAccess,
    startGame: startGame,
    drawNumber: drawNumber,
    startAutoDraw: startAutoDraw,
    pauseAutoDraw: pauseAutoDraw,
    getRandomColor: getRandomColor,
    speakNumber: speakNumber,
    displayNumber: displayNumber,
    restartGame: restartGame,
    goBack: goBack,
    checkBingo: checkBingo,
    mostrarCarton: mostrarCarton,
    verificarCarton: verificarCarton,
    borrarCarton: borrarCarton,
    togglePaymentReference: togglePaymentReference,
    handleImageUpload: handleImageUpload,
    showImagePreview: showImagePreview,
    clearUserForm: clearUserForm,
    addUser: addUser,
    toggleVerification: toggleVerification,
    clearUsersBingo75: clearUsersBingo75,
    clearUsersBingo90: clearUsersBingo90,
    requestDeleteAccess: requestDeleteAccess,
    cancelDeleteAccess: cancelDeleteAccess,
    validateDeleteAccess: validateDeleteAccess,
    updateTotalMoney: updateTotalMoney,
    loadSelectedMoneyAmount: loadSelectedMoneyAmount,
    renderUserTable: renderUserTable,
    updateSellerStats: updateSellerStats,
    clearSellerStats: clearSellerStats,
    updateSellerStatsDisplay: updateSellerStatsDisplay,
    updateTotalCartonsSold: updateTotalCartonsSold
};

