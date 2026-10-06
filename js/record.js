import {
    collection,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";


let startTime = null;
let endTime = null;
let timerInterval = null;

let selectedTypes = [];
let selectedObservations = [];
let selectedOccurrences = [];
let selectedAfters = [];


const timer = document.getElementById("timer");
const timerStatus = document.getElementById("timerStatus");

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const saveButton = document.getElementById("saveButton");



/* ========================================
   타이머
======================================== */

function updateTimer() {

    if (!startTime) {
        timer.textContent = "00:00";
        return;
    }

    const currentTime = endTime || new Date();

    const seconds = Math.floor(
        (currentTime - startTime) / 1000
    );

    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;

    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}



/* ========================================
   시작
======================================== */

startButton.addEventListener("click", () => {

    startTime = new Date();
    endTime = null;

    startButton.disabled = true;
    stopButton.disabled = false;
    saveButton.disabled = true;

    timerStatus.textContent = "증상 기록 중...";

    timerStatus.classList.add("recording");
    timerStatus.classList.remove("completed");

    updateTimer();

    timerInterval = setInterval(updateTimer, 1000);
});



/* ========================================
   종료
======================================== */

stopButton.addEventListener("click", () => {

    if (!startTime) return;

    endTime = new Date();

    clearInterval(timerInterval);
    timerInterval = null;

    updateTimer();

    startButton.disabled = true;
    stopButton.disabled = true;

    timerStatus.textContent = "기록이 종료되었습니다.";

    timerStatus.classList.remove("recording");
    timerStatus.classList.add("completed");

    validateSave();
});



/* ========================================
   증상 유형
   복수 선택
======================================== */

document
    .querySelectorAll("#typeChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value = button.dataset.type;

            const index = selectedTypes.indexOf(value);

            if (index >= 0) {

                // 이미 선택되어 있으면 해제
                selectedTypes.splice(index, 1);

                button.classList.remove("selected");

            } else {

                // 선택되어 있지 않으면 추가
                selectedTypes.push(value);

                button.classList.add("selected");
            }

            validateSave();
        });
    });



/* ========================================
   관찰 사항
   복수 선택
======================================== */

document
    .querySelectorAll("#observationChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value = button.dataset.observation;

            const index =
                selectedObservations.indexOf(value);

            if (index >= 0) {

                selectedObservations.splice(index, 1);

                button.classList.remove("selected");

            } else {

                selectedObservations.push(value);

                button.classList.add("selected");
            }
        });
    });



/* ========================================
   발생 시점
   복수 선택
======================================== */

document
    .querySelectorAll("#occurrenceChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value = button.dataset.occurrence;

            const index =
                selectedOccurrences.indexOf(value);

            if (index >= 0) {

                selectedOccurrences.splice(index, 1);

                button.classList.remove("selected");

            } else {

                selectedOccurrences.push(value);

                button.classList.add("selected");
            }
        });
    });



/* ========================================
   증상 후 상태
   복수 선택
======================================== */

document
    .querySelectorAll("#afterChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value = button.dataset.after;

            const index =
                selectedAfters.indexOf(value);

            if (index >= 0) {

                selectedAfters.splice(index, 1);

                button.classList.remove("selected");

            } else {

                selectedAfters.push(value);

                button.classList.add("selected");
            }
        });
    });



/* ========================================
   저장 가능 여부
======================================== */

function validateSave() {

    saveButton.disabled = !(
        startTime &&
        endTime &&
        selectedTypes.length > 0
    );
}



/* ========================================
   기록 저장
======================================== */

saveButton.addEventListener("click", async () => {

    if (
        !startTime ||
        !endTime ||
        selectedTypes.length === 0
    ) {
        return;
    }


    const duration =
        Math.floor(
            (endTime - startTime) / 1000
        );


    const record = {

        startedAt:
            Timestamp.fromDate(startTime),

        endedAt:
            Timestamp.fromDate(endTime),

        duration,

        // 복수 선택
        type: selectedTypes,

        observations: selectedObservations,

        occurrence: selectedOccurrences,

        after: selectedAfters,

        memo:
            document
                .getElementById("memo")
                .value
                .trim(),

        createdAt:
            Timestamp.now()
    };


    saveButton.disabled = true;
    saveButton.textContent = "저장 중...";


    try {

        await addDoc(
            collection(db, "seizures"),
            record
        );

        alert("증상 기록이 저장되었습니다.");

        location.href = "index.html";

    } catch (error) {

        console.error(
            "증상 기록 저장 실패:",
            error
        );

        alert(
            "기록 저장에 실패했습니다.\n잠시 후 다시 시도해주세요."
        );

        saveButton.disabled = false;
        saveButton.textContent = "기록 저장";
    }
});



/* ========================================
   페이지 나가기 경고
======================================== */

window.addEventListener(
    "beforeunload",
    event => {

        if (startTime && !endTime) {

            event.preventDefault();
            event.returnValue = "";
        }
    }
);