import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
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

let editType = "";
let editObservations = [];
let editAfter = "";


/* ========================================
   공통
======================================== */

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
   예: 2026-10-06
======================================== */

function getTodayKey() {

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* ========================================
   오늘 기록
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
   오후 수면 기록
======================================== */

async function loadTodaySleepRecord() {

    const sleepYesButton =
        document.getElementById("sleepYesButton");

    const sleepNoButton =
        document.getElementById("sleepNoButton");

    const sleepStatus =
        document.getElementById("sleepStatus");

    if (
        !sleepYesButton ||
        !sleepNoButton ||
        !sleepStatus
    ) {
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

            sleepStatus.textContent =
                "오늘 오후 수면함";

        } else if (data.postLunchSleep === false) {

            sleepNoButton.classList.add("selected");

            sleepStatus.textContent =
                "오늘 오후 수면하지 않음";

        } else {

            sleepStatus.textContent =
                "아직 기록하지 않았습니다.";
        }

    } catch (error) {

        console.error(
            "오후 수면 기록 불러오기 실패:",
            error
        );

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
            {
                merge: true
            }
        );

        sleepYesButton.classList.toggle(
            "selected",
            slept === true
        );

        sleepNoButton.classList.toggle(
            "selected",
            slept === false
        );

        sleepStatus.textContent =
            slept
                ? "오늘 오후 수면함"
                : "오늘 오후 수면하지 않음";

    } catch (error) {

        console.error(
            "오후 수면 기록 저장 실패:",
            error
        );

        alert(
            "오후 수면 기록 저장에 실패했습니다."
        );

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
   마지막 증상
======================================== */

async function loadLastRecord() {

    const container =
        document.getElementById("lastRecord");

    try {

        const q = query(
            collection(db, "seizures"),
            orderBy("startedAt", "desc"),
            limit(1)
        );

        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {

            container.innerHTML = `
                <div class="empty-state">
                    아직 기록된 증상이 없습니다.
                </div>
            `;

            return;
        }

        const item = snapshot.docs[0];
        const data = item.data();

        const start = data.startedAt.toDate();

        const record =
            document.createElement("button");

        record.type = "button";
        record.className = "recent-record";

        record.innerHTML = `
            <div class="recent-record-time">

                <strong>
                    ${formatTime(start)}
                </strong>

                <span>
                    ${start.getFullYear()}년
                    ${start.getMonth() + 1}월
                    ${start.getDate()}일
                </span>

            </div>

            <div class="recent-record-info">

                <strong>
                    ${data.type || "기록 없음"}
                </strong>

                <span>
                    ${data.after || "증상 후 상태 미기록"}
                </span>

            </div>

            <div class="recent-record-duration">

                <strong>
                    ${formatDuration(data.duration || 0)}
                </strong>

                <span>
                    ›
                </span>

            </div>
        `;

        record.addEventListener("click", () => {

            openRecordModal(
                item.id,
                data
            );
        });

        container.appendChild(record);

    } catch (error) {

        console.error(
            "마지막 증상 불러오기 실패:",
            error
        );

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

    const start =
        data.startedAt.toDate();

    const end =
        data.endedAt
            ? data.endedAt.toDate()
            : null;

    const observations =
        Array.isArray(data.observations)
            ? data.observations.join(", ")
            : "-";

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

                <strong>
                    ${formatDate(start)}
                    ${formatTime(start)}
                </strong>
            </div>


            <div class="modal-info-row">

                <span>
                    종료 시간
                </span>

                <strong>
                    ${end ? formatTime(end) : "미입력"}
                </strong>

            </div>


            <div class="modal-info-row highlight">

                <span>
                    지속시간
                </span>

                <strong>
                    ${formatDuration(data.duration || 0)}
                </strong>

            </div>


            <div class="modal-info-row">

                <span>
                    증상 유형
                </span>

                <strong>
                    ${data.type || "-"}
                </strong>

            </div>


            <div class="modal-info-row">

                <span>
                    관찰 사항
                </span>

                <strong>
                    ${observations}
                </strong>

            </div>


            <div class="modal-info-row">

                <span>
                    증상 후 상태
                </span>

                <strong>
                    ${data.after || "-"}
                </strong>

            </div>

            ${
                data.memo
                    ? `
                        <div class="modal-info-row">

                            <span>
                                메모
                            </span>

                            <strong>
                                ${data.memo}
                            </strong>

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
   수정
======================================== */

function openEditMode() {

    if (!selectedRecordData) {
        return;
    }

    editType =
        selectedRecordData.type || "";

    editObservations =
        Array.isArray(selectedRecordData.observations)
            ? [...selectedRecordData.observations]
            : [];

    editAfter =
        selectedRecordData.after || "";

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


function updateEditSelections() {

    document
        .querySelectorAll(
            "#editTypeChoices .edit-choice-button"
        )
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                button.dataset.type === editType
            );
        });


    document
        .querySelectorAll(
            "#editObservationChoices .edit-choice-button"
        )
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                editObservations.includes(
                    button.dataset.observation
                )
            );
        });


    document
        .querySelectorAll(
            "#editAfterChoices .edit-choice-button"
        )
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                button.dataset.after === editAfter
            );
        });
}


/* ========================================
   수정 선택 이벤트 바인딩
======================================== */

document
    .querySelectorAll(
        "#editTypeChoices .edit-choice-button"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                editType =
                    button.dataset.type;

                updateEditSelections();
            }
        );
    });


document
    .querySelectorAll(
        "#editObservationChoices .edit-choice-button"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const value =
                    button.dataset.observation;

                if (value === "특이사항 없음") {

                    editObservations =
                        ["특이사항 없음"];

                    updateEditSelections();

                    return;
                }

                editObservations =
                    editObservations.filter(
                        item =>
                            item !== "특이사항 없음"
                    );

                if (
                    editObservations.includes(value)
                ) {

                    editObservations =
                        editObservations.filter(
                            item =>
                                item !== value
                        );

                } else {

                    editObservations.push(value);
                }

                updateEditSelections();
            }
        );
    });


document
    .querySelectorAll(
        "#editAfterChoices .edit-choice-button"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const value =
                    button.dataset.after;

                if (editAfter === value) {

                    editAfter = "";

                } else {

                    editAfter = value;
                }

                updateEditSelections();
            }
        );
    });


document
    .getElementById("editRecordButton")
    .addEventListener(
        "click",
        openEditMode
    );


/* ========================================
   수정 저장
======================================== */

document
    .getElementById("saveEditButton")
    .addEventListener(
        "click",
        async () => {

            if (
                !selectedRecordId ||
                !editType
            ) {

                alert(
                    "증상 유형을 선택해주세요."
                );

                return;
            }

            const saveButton =
                document.getElementById(
                    "saveEditButton"
                );

            saveButton.disabled = true;
            saveButton.textContent =
                "저장 중...";

            try {

                await updateDoc(
                    doc(
                        db,
                        "seizures",
                        selectedRecordId
                    ),
                    {
                        type: editType,

                        observations:
                            editObservations,

                        after:
                            editAfter,

                        memo:
                            document
                                .getElementById(
                                    "editMemo"
                                )
                                .value
                                .trim()
                    }
                );

                alert(
                    "기록이 수정되었습니다."
                );

                closeModal();

                await loadTodayRecords();
                await loadLastRecord();

            } catch (error) {

                console.error(error);

                alert(
                    "기록 수정에 실패했습니다."
                );
            }

            saveButton.disabled = false;

            saveButton.textContent =
                "수정 저장";
        }
    );


/* ========================================
   수정 취소
======================================== */

document
    .getElementById("cancelEditButton")
    .addEventListener(
        "click",
        () => {

            document.getElementById(
                "modalTitle"
            ).textContent = "증상 기록";

            document.getElementById(
                "modalView"
            ).style.display = "block";

            document.getElementById(
                "modalEdit"
            ).style.display = "none";
        }
    );


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
    .addEventListener(
        "click",
        closeModal
    );


document
    .querySelector(
        ".record-modal-background"
    )
    .addEventListener(
        "click",
        closeModal
    );


/* ========================================
   삭제
======================================== */

document
    .getElementById("deleteRecordButton")
    .addEventListener(
        "click",
        async () => {

            if (!selectedRecordId) {
                return;
            }

            const confirmed =
                confirm(
                    "이 기록을 삭제하시겠습니까?"
                );

            if (!confirmed) {
                return;
            }

            try {

                await deleteDoc(
                    doc(
                        db,
                        "seizures",
                        selectedRecordId
                    )
                );

                closeModal();

                await loadTodayRecords();
                await loadLastRecord();

                alert(
                    "기록이 삭제되었습니다."
                );

            } catch (error) {

                console.error(error);

                alert(
                    "기록 삭제에 실패했습니다."
                );
            }
        }
    );


/* ========================================
   시작 실행
======================================== */

updateTodayDate();

loadTodayRecords();

loadLastRecord();

loadTodaySleepRecord();