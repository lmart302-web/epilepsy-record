
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    updateDoc,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";


let selectedRecordId = null;
let selectedRecordData = null;

let editTypes = [];
let editObservations = [];
let editOccurrences = [];
let editAfters = [];


/* ========================================
   공통
======================================== */

// 기존 데이터가 배열이든 문자열이든 배열로 변환
function toArray(value) {

    if (Array.isArray(value)) {
        return value.filter(item => typeof item === "string");
    }

    if (typeof value === "string" && value.trim()) {
        return [value];
    }

    return [];
}


// 배열 데이터를 화면에 표시할 문자열로 변환
function displayValue(value) {

    return toArray(value).join(", ") || "-";
}


function formatDuration(seconds) {

    if (!seconds) {
        return "0초";
    }

    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;

    if (minutes === 0) {
        return `${remainSeconds}초`;
    }

    if (remainSeconds === 0) {
        return `${minutes}분`;
    }

    return `${minutes}분 ${remainSeconds}초`;
}


function formatDate(date) {

    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}


function formatTime(date) {

    return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* ========================================
   오늘 날짜
======================================== */

function updateTodayDate() {

    const today = new Date();

    document.getElementById("todayDate").textContent =
        `${today.getMonth() + 1}월 ${today.getDate()}일`;
}


/* ========================================
   날짜 키
======================================== */

function getTodayKey() {

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* ========================================
   오늘 기록 현황
======================================== */

async function loadTodayRecords() {

    const today = new Date();

    const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const tomorrowStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
    );

    try {

        const q = query(
            collection(db, "seizures"),
            where("startedAt", ">=", todayStart),
            where("startedAt", "<", tomorrowStart),
            orderBy("startedAt", "desc")
        );

        const snapshot = await getDocs(q);

        let totalDuration = 0;
        let longestDuration = 0;

        snapshot.forEach((item) => {

            const data = item.data();
            const duration = data.duration || 0;

            totalDuration += duration;

            if (duration > longestDuration) {
                longestDuration = duration;
            }
        });

        document.getElementById("todayCount").textContent =
            `${snapshot.size}회`;

        document.getElementById("todayTotal").textContent =
            formatDuration(totalDuration);

        document.getElementById("todayLongest").textContent =
            formatDuration(longestDuration);

    } catch (error) {

        console.error("오늘 기록 불러오기 실패:", error);
    }
}


/* ========================================
   오후 수면 기록 불러오기
======================================== */

async function loadTodaySleepRecord() {

    const sleepYesButton =
        document.getElementById("sleepYesButton");

    const sleepNoButton =
        document.getElementById("sleepNoButton");

    const sleepStatus =
        document.getElementById("sleepStatus");

    if (!sleepYesButton || !sleepNoButton || !sleepStatus) {
        return;
    }

    const todayKey = getTodayKey();

    try {

        const sleepRef = doc(
            db,
            "dailyRecords",
            todayKey
        );

        const snapshot = await getDoc(sleepRef);

        sleepYesButton.classList.remove("selected");
        sleepNoButton.classList.remove("selected");

        if (!snapshot.exists()) {

            sleepStatus.textContent =
                "아직 기록하지 않았습니다.";

            return;
        }

        const data = snapshot.data();

        if (data.postLunchSleep === true) {

            sleepYesButton.classList.add("selected");
            sleepStatus.textContent = "오늘 오후 수면함";

        } else if (data.postLunchSleep === false) {

            sleepNoButton.classList.add("selected");
            sleepStatus.textContent = "오늘 오후 수면하지 않음";

        } else {

            sleepStatus.textContent =
                "아직 기록하지 않았습니다.";
        }

    } catch (error) {

        console.error("오후 수면 기록 불러오기 실패:", error);

        sleepStatus.textContent =
            "기록을 불러오지 못했습니다.";
    }
}


/* ========================================
   오후 수면 기록 저장
======================================== */

async function saveSleepRecord(slept) {

    const sleepYesButton =
        document.getElementById("sleepYesButton");

    const sleepNoButton =
        document.getElementById("sleepNoButton");

    const sleepStatus =
        document.getElementById("sleepStatus");

    const todayKey = getTodayKey();

    try {

        sleepYesButton.disabled = true;
        sleepNoButton.disabled = true;

        const sleepRef = doc(
            db,
            "dailyRecords",
            todayKey
        );

        await setDoc(
            sleepRef,
            {
                date: todayKey,
                postLunchSleep: slept,
                updatedAt: serverTimestamp()
            },
            { merge: true }
        );

        sleepYesButton.classList.toggle(
            "selected",
            slept === true
        );

        sleepNoButton.classList.toggle(
            "selected",
            slept === false
        );

        sleepStatus.textContent = slept
            ? "오늘 오후 수면함"
            : "오늘 오후 수면하지 않음";

    } catch (error) {

        console.error("오후 수면 기록 저장 실패:", error);

        alert("오후 수면 기록 저장에 실패했습니다.");

    } finally {

        sleepYesButton.disabled = false;
        sleepNoButton.disabled = false;
    }
}


/* ========================================
   오후 수면 버튼 이벤트
======================================== */

document
    .getElementById("sleepYesButton")
    .addEventListener("click", () => {
        saveSleepRecord(true);
    });


document
    .getElementById("sleepNoButton")
    .addEventListener("click", () => {
        saveSleepRecord(false);
    });


/* ========================================
   오늘의 증상
======================================== */

async function loadLastRecord() {

    const container =
        document.getElementById("lastRecord");

    const today = new Date();

    const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const tomorrowStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
    );

    try {

        const q = query(
            collection(db, "seizures"),
            where("startedAt", ">=", todayStart),
            where("startedAt", "<", tomorrowStart),
            orderBy("startedAt", "desc")
        );

        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {

            container.innerHTML = `
                <div class="empty-state">
                    오늘 기록된 증상이 없습니다.
                </div>
            `;

            return;
        }

        snapshot.forEach((item) => {

            const data = item.data();
            const start = data.startedAt.toDate();

            const record = document.createElement("button");

            record.type = "button";
            record.className = "recent-record";

            record.innerHTML = `
                <div class="recent-record-time">
                    <strong>${formatTime(start)}</strong>
                    <span>오늘</span>
                </div>

                <div class="recent-record-info">
                    <strong>${displayValue(data.type) === "-" ? "기록 없음" : displayValue(data.type)}</strong>
                    <span>${displayValue(data.after) === "-" ? "증상 후 상태 미기록" : displayValue(data.after)}</span>
                </div>

                <div class="recent-record-duration">
                    <strong>${formatDuration(data.duration || 0)}</strong>
                    <span>›</span>
                </div>
            `;

            record.addEventListener("click", () => {
                openRecordModal(item.id, data);
            });

            container.appendChild(record);
        });

    } catch (error) {

        console.error("오늘의 증상 불러오기 실패:", error);

        container.innerHTML = `
            <div class="empty-state">
                기록을 불러오지 못했습니다.
            </div>
        `;
    }
}


/* ========================================
   상세 모달
======================================== */

function openRecordModal(id, data) {

    selectedRecordId = id;
    selectedRecordData = data;

    const start = data.startedAt.toDate();

    const end = data.endedAt
        ? data.endedAt.toDate()
        : null;

    document.getElementById("modalTitle").textContent =
        "증상 기록";

    document.getElementById("modalView").style.display =
        "block";

    document.getElementById("modalEdit").style.display =
        "none";

    const modalBody =
        document.getElementById("modalBody");

    modalBody.innerHTML = `
        <div class="modal-info">

            <div class="modal-info-row">
                <span>발생 시간</span>
                <strong>${formatDate(start)} ${formatTime(start)}</strong>
            </div>

            <div class="modal-info-row">
                <span>종료 시간</span>
                <strong>${end ? formatTime(end) : "미입력"}</strong>
            </div>

            <div class="modal-info-row highlight">
                <span>지속시간</span>
                <strong>${formatDuration(data.duration || 0)}</strong>
            </div>

            <div class="modal-info-row">
                <span>증상 유형</span>
                <strong>${displayValue(data.type)}</strong>
            </div>

            <div class="modal-info-row">
                <span>관찰 사항</span>
                <strong>${displayValue(data.observations)}</strong>
            </div>

            <div class="modal-info-row">
                <span>발생 시점</span>
                <strong>${displayValue(data.occurrence)}</strong>
            </div>

            <div class="modal-info-row">
                <span>증상 후 상태</span>
                <strong>${displayValue(data.after)}</strong>
            </div>

            ${
                data.memo
                    ? `
                        <div class="modal-info-row">
                            <span>메모</span>
                            <strong>${data.memo}</strong>
                        </div>
                    `
                    : ""
            }

        </div>
    `;

    document
        .getElementById("recordModal")
        .classList.add("show");
}


/* ========================================
   수정 모드 열기
======================================== */

function openEditMode() {

    if (!selectedRecordData) {
        return;
    }

    // 기존에 저장된 배열을 그대로 불러옴.
    // 문자열로 저장된 이전 데이터도 호환.
    editTypes =
        toArray(selectedRecordData.type);

    editObservations =
        toArray(selectedRecordData.observations);

    editOccurrences =
        toArray(selectedRecordData.occurrence);

    editAfters =
        toArray(selectedRecordData.after);

    document.getElementById("editMemo").value =
        selectedRecordData.memo || "";

    document.getElementById("modalTitle").textContent =
        "기록 수정";

    document.getElementById("modalView").style.display =
        "none";

    document.getElementById("modalEdit").style.display =
        "block";

    updateEditSelections();
}


/* ========================================
   수정 화면 선택 상태 갱신
======================================== */

function updateEditSelections() {

    document
        .querySelectorAll("#editTypeChoices .edit-choice-button")
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                editTypes.includes(button.dataset.type)
            );
        });


    document
        .querySelectorAll("#editObservationChoices .edit-choice-button")
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                editObservations.includes(button.dataset.observation)
            );
        });


    document
        .querySelectorAll("#editOccurrenceChoices .edit-choice-button")
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                editOccurrences.includes(button.dataset.occurrence)
            );
        });


    document
        .querySelectorAll("#editAfterChoices .edit-choice-button")
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                editAfters.includes(button.dataset.after)
            );
        });
}


/* ========================================
   증상 유형 선택
======================================== */

document
    .querySelectorAll("#editTypeChoices .edit-choice-button")
    .forEach((button) => {

        button.addEventListener("click", () => {

            const value = button.dataset.type;

            if (editTypes.includes(value)) {

                editTypes = editTypes.filter(
                    item => item !== value
                );

            } else {

                editTypes.push(value);
            }

            updateEditSelections();
        });
    });


/* ========================================
   관찰 사항 선택
======================================== */

document
    .querySelectorAll("#editObservationChoices .edit-choice-button")
    .forEach((button) => {

        button.addEventListener("click", () => {

            const value = button.dataset.observation;

            if (editObservations.includes(value)) {

                editObservations = editObservations.filter(
                    item => item !== value
                );

            } else {

                editObservations.push(value);
            }

            updateEditSelections();
        });
    });


/* ========================================
   발생 시점 선택
======================================== */

document
    .querySelectorAll("#editOccurrenceChoices .edit-choice-button")
    .forEach((button) => {

        button.addEventListener("click", () => {

            const value = button.dataset.occurrence;

            if (editOccurrences.includes(value)) {

                editOccurrences = editOccurrences.filter(
                    item => item !== value
                );

            } else {

                editOccurrences.push(value);
            }

            updateEditSelections();
        });
    });


/* ========================================
   증상 후 상태 선택
======================================== */

document
    .querySelectorAll("#editAfterChoices .edit-choice-button")
    .forEach((button) => {

        button.addEventListener("click", () => {

            const value = button.dataset.after;

            if (editAfters.includes(value)) {

                editAfters = editAfters.filter(
                    item => item !== value
                );

            } else {

                editAfters.push(value);
            }

            updateEditSelections();
        });
    });


/* ========================================
   수정 버튼
======================================== */

document
    .getElementById("editRecordButton")
    .addEventListener("click", openEditMode);


/* ========================================
   수정 저장
======================================== */

document
    .getElementById("saveEditButton")
    .addEventListener("click", async () => {

        if (!selectedRecordId || editTypes.length === 0) {

            alert("증상 유형을 하나 이상 선택해주세요.");

            return;
        }

        const saveButton =
            document.getElementById("saveEditButton");

        saveButton.disabled = true;
        saveButton.textContent = "저장 중...";

        try {

            await updateDoc(
                doc(db, "seizures", selectedRecordId),
                {
                    type: editTypes,
                    observations: editObservations,
                    occurrence: editOccurrences,
                    after: editAfters,
                    memo: document
                        .getElementById("editMemo")
                        .value
                        .trim()
                }
            );

            // 저장된 값으로 상세 화면 데이터도 갱신
            selectedRecordData = {
                ...selectedRecordData,
                type: editTypes,
                observations: editObservations,
                occurrence: editOccurrences,
                after: editAfters,
                memo: document
                    .getElementById("editMemo")
                    .value
                    .trim()
            };

            alert("기록이 수정되었습니다.");

            closeModal();

            await loadTodayRecords();
            await loadLastRecord();

        } catch (error) {

            console.error("기록 수정 실패:", error);

            alert("기록 수정에 실패했습니다.");

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "수정 저장";
        }
    });


/* ========================================
   수정 취소
======================================== */

document
    .getElementById("cancelEditButton")
    .addEventListener("click", () => {

        document.getElementById("modalTitle").textContent =
            "증상 기록";

        document.getElementById("modalView").style.display =
            "block";

        document.getElementById("modalEdit").style.display =
            "none";
    });


/* ========================================
   모달 닫기
======================================== */

function closeModal() {

    document
        .getElementById("recordModal")
        .classList.remove("show");

    selectedRecordId = null;
    selectedRecordData = null;
}


document
    .getElementById("closeModal")
    .addEventListener("click", closeModal);


document
    .querySelector(".record-modal-background")
    .addEventListener("click", closeModal);


/* ========================================
   삭제
======================================== */

document
    .getElementById("deleteRecordButton")
    .addEventListener("click", async () => {

        if (!selectedRecordId) {
            return;
        }

        const confirmed = confirm(
            "이 기록을 삭제하시겠습니까?"
        );

        if (!confirmed) {
            return;
        }

        try {

            await deleteDoc(
                doc(db, "seizures", selectedRecordId)
            );

            closeModal();

            await loadTodayRecords();
            await loadLastRecord();

            alert("기록이 삭제되었습니다.");

        } catch (error) {

            console.error("기록 삭제 실패:", error);

            alert("기록 삭제에 실패했습니다.");
        }
    });


/* ========================================
   시작 실행
======================================== */

updateTodayDate();

loadTodayRecords();

loadLastRecord();

loadTodaySleepRecord();
