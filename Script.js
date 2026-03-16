const result = document.getElementById("result");

const buttons = document.querySelectorAll(".buttons button");

const historyList = document.getElementById("historyList");

// Load history from localStorage on page load

let history = JSON.parse(localStorage.getItem("calcHistory")) || [];

renderHistory();

buttons.forEach(button => {

  button.addEventListener("click", () => {

    const value = button.textContent;

    switch (value) {

      case "C":

        result.value = "";

        break;

      case "⌫":

        result.value = result.value.slice(0, -1);

        break;

      case "=":

    try {

        // Replace display operators with JS equivalents

        let expression = result.value.replace(/÷/g, "/").replace(/×/g, "*").replace(/−/g, "-");

        // Check for invalid characters (letters or special symbols)

        if (/[^0-9/*+.\-() ]/.test(expression)) {

            throw "Invalid"; // invalid input

        }

        // Evaluate safely

        const evalResult = Function('"use strict";return (' + expression + ')')();

        addToHistory(result.value + " = " + evalResult);

        result.value = evalResult;

    } catch {

        result.value = "Error";

    }

    break;

      default:

        result.value += value;

    }

  });

});

function addToHistory(entry) {

  history.push(entry);

  localStorage.setItem("calcHistory", JSON.stringify(history));

  renderHistory();

}

function renderHistory() {

  historyList.innerHTML = "";

  history.forEach(item => {

    const li = document.createElement("li");

    li.textContent = item;

    historyList.appendChild(li);

  });

}
const toggleBtn = document.getElementById("toggleHistory");

const historyDiv = document.querySelector(".history");

toggleBtn.addEventListener("click", () => {

  historyDiv.classList.toggle("show");

});
const clearBtn = document.getElementById("clearHistory");

clearBtn.addEventListener("click", () => {

    history = []; // empty the array

    localStorage.removeItem("calcHistory"); // remove from localStorage

    renderHistory(); // update the UI

});
