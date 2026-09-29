import {
    collection,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";


let startTime = null;
let endTime = null;
let timerInterval = null;

let selectedType = "";
let selectedObservations = [];
let selectedAfter = "";


const timer = document.getElementById("timer");
const timerStatus = document.getElementById("timerStatus");

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const saveButton = document.getElementById("saveButton");


/* ========================================
   시간 표시
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

    timerStatus.textContent = "발작 기록 중...";
    timerStatus.classList.add("recording");
    timerStatus.classList.remove("completed");

    updateTimer();

    timerInterval = setInterval(updateTimer, 1000);
});


/* ========================================
   종료
======================================== */

stopButton.addEventListener("click", () => {

    if (!startTime) {
        return;
    }

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
   발작 유형
======================================== */

document
    .querySelectorAll("#typeChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll("#typeChoices .choice-button")
                .forEach(item => {
                    item.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedType = button.dataset.type;

            validateSave();
        });

    });


/* ========================================
   관찰 사항
======================================== */

document
    .querySelectorAll("#observationChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value = button.dataset.observation;


            if (value === "특이사항 없음") {

                selectedObservations = [
                    "특이사항 없음"
                ];

                document
                    .querySelectorAll("#observationChoices .choice-button")
                    .forEach(item => {
                        item.classList.remove("selected");
                    });

                button.classList.add("selected");

                return;
            }


            selectedObservations =
                selectedObservations.filter(
                    item => item !== "특이사항 없음"
                );


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
   발작 후 상태
======================================== */

document
    .querySelectorAll("#afterChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll("#afterChoices .choice-button")
                .forEach(item => {
                    item.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedAfter = button.dataset.after;

        });

    });


/* ========================================
   저장 가능 여부
======================================== */

function validateSave() {

    saveButton.disabled =
        !(startTime && endTime && selectedType);
}


/* ========================================
   저장
======================================== */

saveButton.addEventListener("click", async () => {

    if (!startTime || !endTime || !selectedType) {
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

        type:
            selectedType,

        observations:
            selectedObservations,

        after:
            selectedAfter,

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

        alert("발작 기록이 저장되었습니다.");

        location.href = "index.html";

    } catch (error) {

        console.error("발작 기록 저장 실패:", error);

        alert(
            "기록 저장에 실패했습니다.\n잠시 후 다시 시도해주세요."
        );

        saveButton.disabled = false;
        saveButton.textContent = "기록 저장";
    }

});


/* ========================================
   페이지 이탈 방지
======================================== */

window.addEventListener("beforeunload", event => {

    if (startTime && !endTime) {

        event.preventDefault();
        event.returnValue = "";
    }

});