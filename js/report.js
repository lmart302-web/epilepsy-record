import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";


let currentDate = new Date();


/* ========================================
   공통
======================================== */

function formatDuration(seconds) {

    seconds = Number(seconds) || 0;

    if (seconds === 0) {
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


/* ========================================
   날짜 변환
======================================== */

function getRecordDate(value) {

    if (!value) {
        return null;
    }

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === "string") {
        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    if (typeof value === "number") {
        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    return null;
}


/* ========================================
   월 제목
======================================== */

function updateMonthTitle() {

    document.getElementById("currentMonth").textContent =
        `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
}


/* ========================================
   월간 요약
======================================== */

function updateSummary(records) {

    const totalCount =
        records.length;

    const totalDuration =
        records.reduce(
            (sum, record) =>
                sum + (Number(record.duration) || 0),
            0
        );

    const longestDuration =
        records.reduce(
            (max, record) =>
                Math.max(
                    max,
                    Number(record.duration) || 0
                ),
            0
        );

    const averageDuration =
        totalCount > 0
            ? Math.round(totalDuration / totalCount)
            : 0;


    document.getElementById("totalCount").textContent =
        `${totalCount}회`;

    document.getElementById("averageDuration").textContent =
        formatDuration(averageDuration);

    document.getElementById("longestDuration").textContent =
        formatDuration(longestDuration);
}


/* ========================================
   발생 시간
======================================== */

function updateTimeBars(records) {

    const container =
        document.getElementById("timeBars");

    container.innerHTML = "";


    const timeRanges = [
    { label: "10:00 ~ 10:30", hour: 10, minute: 0 },
    { label: "10:30 ~ 11:00", hour: 10, minute: 30 },
    { label: "11:00 ~ 11:30", hour: 11, minute: 0 },
    { label: "11:30 ~ 12:00", hour: 11, minute: 30 },
    { label: "12:00 ~ 12:30", hour: 12, minute: 0 },
    { label: "12:30 ~ 13:00", hour: 12, minute: 30 },
    { label: "13:00 ~ 13:30", hour: 13, minute: 0 },
    { label: "13:30 ~ 14:00", hour: 13, minute: 30 },
    { label: "14:00 ~ 14:30", hour: 14, minute: 0 },
    { label: "14:30 ~ 15:00", hour: 14, minute: 30 },
    { label: "15:00 ~ 15:30", hour: 15, minute: 0 }
];


const counts =
    timeRanges.map(range => {

        return records.filter(record => {

            const date =
                getRecordDate(record.startedAt);

            if (!date) {
                return false;
            }

            const recordMinutes =
                date.getHours() * 60 + date.getMinutes();

            const rangeStartMinutes =
                range.hour * 60 + range.minute;

            const rangeEndMinutes =
                rangeStartMinutes + 30;

            return (
                recordMinutes >= rangeStartMinutes &&
                recordMinutes < rangeEndMinutes
            );

        }).length;

    });

        


    const maxCount =
        Math.max(...counts, 0);


    timeRanges.forEach((range, index) => {

        const count = counts[index];

        const width =
            maxCount > 0
                ? `${Math.max(
                    (count / maxCount) * 100,
                    count > 0 ? 8 : 0
                )}%`
                : "0%";


        const row =
            document.createElement("div");

        row.className = "time-bar-row";

        row.innerHTML = `

            <div class="time-bar-label">

                <span>
                    ${range.label}
                </span>

                <strong>
                    ${count}회
                </strong>

            </div>

            <div class="time-bar-background">

                <div
                    class="time-bar-fill"
                    style="width: ${width}"
                ></div>

            </div>
        `;


        container.appendChild(row);
    });
}


/* ========================================
   증상 유형
======================================== */

function updateTypeBars(records) {

    const container =
        document.getElementById("typeBars");

    container.innerHTML = "";


    if (records.length === 0) {

        container.innerHTML = `
            <div class="report-empty">
                기록이 없습니다.
            </div>
        `;

        return;
    }


    const counts = {};


    records.forEach(record => {

        const type =
            record.type || "기록 없음";

        counts[type] =
            (counts[type] || 0) + 1;
    });


    const sortedTypes =
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1]);


    const maxCount =
        sortedTypes.length > 0
            ? sortedTypes[0][1]
            : 0;


    sortedTypes.forEach(([type, count]) => {

        const width =
            maxCount > 0
                ? `${Math.max(
                    (count / maxCount) * 100,
                    8
                )}%`
                : "0%";


        const row =
            document.createElement("div");

        row.className = "type-bar-row";

        row.innerHTML = `

            <div class="type-bar-label">

                <span>
                    ${type}
                </span>

                <strong>
                    ${count}회
                </strong>

            </div>

            <div class="type-bar-background">

                <div
                    class="type-bar-fill"
                    style="width: ${width}"
                ></div>

            </div>
        `;


        container.appendChild(row);
    });
}


/* ========================================
   일별 발생
   실제 기록이 있는 날짜만 표시
======================================== */

function updateDailyRecords(records) {

    const container =
        document.getElementById("dailyRecords");

    container.innerHTML = "";


    if (records.length === 0) {

        container.innerHTML = `
            <div class="report-empty">
                기록이 없습니다.
            </div>
        `;

        return;
    }


    const dailyCounts = {};


    records.forEach(record => {

        const date =
            getRecordDate(record.startedAt);

        if (!date) {
            return;
        }


        const key =
            `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}-${String(
                date.getDate()
            ).padStart(2, "0")}`;


        dailyCounts[key] =
            (dailyCounts[key] || 0) + 1;
    });


    const dates =
        Object.keys(dailyCounts)
            .sort();


    const maxCount =
        Math.max(
            ...Object.values(dailyCounts),
            1
        );


    dates.forEach(dateKey => {

        const [year, month, day] =
            dateKey.split("-").map(Number);

        const date =
            new Date(year, month - 1, day);

        const count =
            dailyCounts[dateKey];


        const column =
            document.createElement("div");

        column.className =
            "daily-chart-column";


        const barHeight =
            Math.max(
                (count / maxCount) * 100,
                4
            );


        column.innerHTML = `

            <div class="daily-chart-count">
                ${count}회
            </div>

            <div class="daily-chart-bar-wrap">

                <div
                    class="daily-chart-bar"
                    style="height: ${barHeight}%"
                ></div>

            </div>

            <div class="daily-chart-label">

                ${date.getMonth() + 1}/${date.getDate()}
                <br>
                ${["일", "월", "화", "수", "목", "금", "토"][date.getDay()]}

            </div>
        `;


        container.appendChild(column);
    });
}


/* ========================================
   상세 기록
======================================== */

function updateDetailRecords(records) {

    const container =
        document.getElementById("detailRecords");

    container.innerHTML = "";


    if (records.length === 0) {

        container.innerHTML = `
            <div class="report-empty">
                기록이 없습니다.
            </div>
        `;

        return;
    }


    const sortedRecords =
        [...records].sort((a, b) => {

            const dateA =
                getRecordDate(a.startedAt);

            const dateB =
                getRecordDate(b.startedAt);

            return dateB - dateA;
        });


    sortedRecords.forEach(record => {

        const date =
            getRecordDate(record.startedAt);

        if (!date) {
            return;
        }


        const observations =
            Array.isArray(record.observations)
                ? record.observations.join(", ")
                : "-";


        const memo =
            record.memo || "";


        const item =
            document.createElement("div");

        item.className =
            "detail-record";


        item.innerHTML = `

            <div class="detail-record-top">

                <div>

                    <strong>
                        ${date.getMonth() + 1}월 ${date.getDate()}일
                    </strong>

                    <span>
                        ${date.toLocaleTimeString(
                            "ko-KR",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )}
                    </span>

                </div>

                <strong>
                    ${formatDuration(record.duration || 0)}
                </strong>

            </div>


            <div class="detail-record-info">

                <div>

                    <span>
                        증상 유형
                    </span>

                    <strong>
                        ${record.type || "-"}
                    </strong>

                </div>


                <div>

                    <span>
                        증상 후 상태
                    </span>

                    <strong>
                        ${record.after || "-"}
                    </strong>

                </div>


                <div>

                    <span>
                        관찰 사항
                    </span>

                    <strong>
                        ${observations}
                    </strong>

                </div>

                ${
                    memo
                        ? `
                            <div>
                                <span>메모</span>
                                <strong>${memo}</strong>
                            </div>
                        `
                        : ""
                }

            </div>
        `;


        container.appendChild(item);
    });
}


/* ========================================
   상세 기록 펼치기
======================================== */

document
    .getElementById("detailSectionToggle")
    .addEventListener("click", () => {

        document
            .getElementById("detailSection")
            .classList.toggle("open");

    });


/* ========================================
   리포트 불러오기
======================================== */

async function loadReport() {

    updateMonthTitle();


    const year =
        currentDate.getFullYear();

    const month =
        currentDate.getMonth();


    const monthStart =
        new Date(
            year,
            month,
            1
        );


    const nextMonthStart =
        new Date(
            year,
            month + 1,
            1
        );


    try {

        const q = query(
            collection(db, "seizures"),
            where(
                "startedAt",
                ">=",
                monthStart
            ),
            where(
                "startedAt",
                "<",
                nextMonthStart
            ),
            orderBy("startedAt", "asc")
        );


        const snapshot =
            await getDocs(q);


        const records =
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));


        updateSummary(records);
        updateTimeBars(records);
        updateTypeBars(records);
        updateDailyRecords(records);
        updateDetailRecords(records);

    } catch (error) {

        console.error(
            "리포트 불러오기 실패:",
            error
        );

    }
}


/* ========================================
   월 이동
======================================== */

document
    .getElementById("prevMonth")
    .addEventListener("click", () => {

        currentDate =
            new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - 1,
                1
            );

        loadReport();
    });


document
    .getElementById("nextMonth")
    .addEventListener("click", () => {

        currentDate =
            new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                1
            );

        loadReport();
    });


/* ========================================
   시작
======================================== */

loadReport();