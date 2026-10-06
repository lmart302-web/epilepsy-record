import {
    collection,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";


let selectedTypes = [];
let selectedObservations = [];
let selectedOccurrences = [];
let selectedAfters = [];


const dateInput = document.getElementById("occurDate");
const startInput = document.getElementById("startTime");
const endInput = document.getElementById("endTime");

const durationPreview =
    document.getElementById("durationPreview");

const saveButton =
    document.getElementById("saveManualButton");


/* ========================================
   기본 날짜 / 시간
======================================== */

const now = new Date();

dateInput.value = formatDate(now);
startInput.value = formatTime(now);


/* ========================================
   날짜 / 시간 형식
======================================== */

function formatDate(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatTime(date) {

    const hours =
        String(date.getHours()).padStart(2, "0");

    const minutes =
        String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}


/* ========================================
   지속시간
======================================== */

function formatDuration(seconds) {

    if (!seconds) {
        return "0초";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainSeconds =
        seconds % 60;


    if (minutes === 0) {
        return `${remainSeconds}초`;
    }


    if (remainSeconds === 0) {
        return `${minutes}분`;
    }


    return `${minutes}분 ${remainSeconds}초`;
}


function updateDuration() {

    const date = dateInput.value;
    const start = startInput.value;
    const end = endInput.value;


    if (!date || !start || !end) {

        durationPreview.textContent =
            "미입력";

        return;
    }


    const startDate =
        new Date(`${date}T${start}`);

    const endDate =
        new Date(`${date}T${end}`);


    // 자정을 넘긴 경우
    if (endDate < startDate) {

        endDate.setDate(
            endDate.getDate() + 1
        );
    }


    const seconds =
        Math.floor(
            (endDate - startDate) / 1000
        );


    if (seconds < 0) {

        durationPreview.textContent =
            "확인 필요";

        return;
    }


    durationPreview.textContent =
        formatDuration(seconds);
}


dateInput.addEventListener(
    "change",
    updateDuration
);

startInput.addEventListener(
    "change",
    updateDuration
);

endInput.addEventListener(
    "change",
    updateDuration
);


/* ========================================
   증상 유형
   여러 개 선택 가능
======================================== */

document
    .querySelectorAll("#typeChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value =
                button.dataset.value;


            const index =
                selectedTypes.indexOf(value);


            if (index >= 0) {

                // 이미 선택된 항목 → 해제
                selectedTypes.splice(
                    index,
                    1
                );

                button.classList.remove(
                    "selected"
                );

            } else {

                // 선택되지 않은 항목 → 추가
                selectedTypes.push(value);

                button.classList.add(
                    "selected"
                );
            }

        });

    });


/* ========================================
   관찰 사항
   여러 개 선택 가능
======================================== */

document
    .querySelectorAll("#observationChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value =
                button.dataset.value;


            const index =
                selectedObservations.indexOf(value);


            if (index >= 0) {

                selectedObservations.splice(
                    index,
                    1
                );

                button.classList.remove(
                    "selected"
                );

            } else {

                selectedObservations.push(value);

                button.classList.add(
                    "selected"
                );
            }

        });

    });


/* ========================================
   발생 시점
   여러 개 선택 가능
======================================== */

document
    .querySelectorAll("#occurrenceChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value =
                button.dataset.value;


            const index =
                selectedOccurrences.indexOf(value);


            if (index >= 0) {

                selectedOccurrences.splice(
                    index,
                    1
                );

                button.classList.remove(
                    "selected"
                );

            } else {

                selectedOccurrences.push(value);

                button.classList.add(
                    "selected"
                );
            }

        });

    });


/* ========================================
   증상 후 상태
   여러 개 선택 가능
======================================== */

document
    .querySelectorAll("#afterChoices .choice-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const value =
                button.dataset.value;


            const index =
                selectedAfters.indexOf(value);


            if (index >= 0) {

                selectedAfters.splice(
                    index,
                    1
                );

                button.classList.remove(
                    "selected"
                );

            } else {

                selectedAfters.push(value);

                button.classList.add(
                    "selected"
                );
            }

        });

    });


/* ========================================
   저장
======================================== */

saveButton.addEventListener(
    "click",
    async () => {

        const date = dateInput.value;
        const start = startInput.value;
        const end = endInput.value;


        const memo =
            document
                .getElementById("memo")
                .value
                .trim();


        if (!date || !start) {

            alert(
                "발생 날짜와 시간을 입력해주세요."
            );

            return;
        }


        if (selectedTypes.length === 0) {

            alert(
                "증상 유형을 선택해주세요."
            );

            return;
        }


        const startedAt =
            new Date(`${date}T${start}`);


        let endedAt = null;
        let duration = 0;


        if (end) {

            endedAt =
                new Date(`${date}T${end}`);


            // 자정을 넘긴 경우
            if (endedAt < startedAt) {

                endedAt.setDate(
                    endedAt.getDate() + 1
                );
            }


            duration =
                Math.floor(
                    (endedAt - startedAt) / 1000
                );


            if (duration < 0) {

                alert(
                    "종료 시간을 확인해주세요."
                );

                return;
            }
        }


        const record = {

            startedAt:
                Timestamp.fromDate(
                    startedAt
                ),

            endedAt:
                endedAt
                    ? Timestamp.fromDate(endedAt)
                    : null,

            duration,


            // 복수 선택
            type:
                selectedTypes,

            observations:
                selectedObservations,

            occurrence:
                selectedOccurrences,

            after:
                selectedAfters,

            memo,

            createdAt:
                Timestamp.now(),

            recordMethod:
                "manual"
        };


        saveButton.disabled = true;

        saveButton.textContent =
            "저장 중...";


        try {

            await addDoc(
                collection(db, "seizures"),
                record
            );


            alert(
                "증상 기록이 저장되었습니다."
            );


            location.href =
                "index.html";


        } catch (error) {

            console.error(
                "수동 기록 저장 실패:",
                error
            );


            alert(
                "저장하지 못했습니다.\n잠시 후 다시 시도해주세요."
            );


            saveButton.disabled = false;

            saveButton.textContent =
                "지난 증상 기록 저장";
        }

    }
);