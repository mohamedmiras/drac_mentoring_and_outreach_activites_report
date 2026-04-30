const url = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAJOaNxOe5Ykp9C_LC0_vddN4z_B3hqS8w";
const body = { email: "admin@darurahma.com", password: "password123", returnSecureToken: true };

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
