
import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";


let currentDate = new Date();

let currentMonthRecords = [];
let currentMonthDailyRecords = [];


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


function escapeHtml(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );

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
   날짜 키
======================================== */

function getDateKey(date) {

    if (!date) {
        return "";
    }

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
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

    const totalCount = records.length;

    const totalDuration = records.reduce(
        (sum, record) =>
            sum + (Number(record.duration) || 0),
        0
    );

    const longestDuration = records.reduce(
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

function getTimeRanges() {

    return [
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
}


function getTimeCounts(records) {

    const timeRanges = getTimeRanges();

    return timeRanges.map(range => {

        return records.filter(record => {

            const date = getRecordDate(record.startedAt);

            if (!date) {
                return false;
            }

            const recordMinutes =
                date.getHours() * 60 + date.getMinutes();

            const rangeStartMinutes =
                range.hour * 60 + range.minute;

            return (
                recordMinutes >= rangeStartMinutes &&
                recordMinutes < rangeStartMinutes + 30
            );

        }).length;

    });
}


function updateTimeBars(records) {

    const container =
        document.getElementById("timeBars");

    container.innerHTML = "";

    const timeRanges = getTimeRanges();
    const counts = getTimeCounts(records);

    const maxCount = Math.max(...counts, 0);

    timeRanges.forEach((range, index) => {

        const count = counts[index];

        const width =
            maxCount > 0
                ? `${Math.max(
                    (count / maxCount) * 100,
                    count > 0 ? 8 : 0
                )}%`
                : "0%";

        const row = document.createElement("div");

        row.className = "time-bar-row";

        row.innerHTML = `

            <div class="time-bar-label">

                <span>${range.label}</span>

                <strong>${count}회</strong>

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
   발생시점
======================================== */

function getOccurrenceCounts(records) {

    const counts = {};

    records.forEach(record => {

        const occurrences =
            Array.isArray(record.occurrence)
                ? record.occurrence
                : [];

        occurrences.forEach(occurrence => {

            counts[occurrence] =
                (counts[occurrence] || 0) + 1;

        });

    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1]);
}


function updateOccurrenceBars(records) {

    const container =
        document.getElementById("occurrenceBars");

    container.innerHTML = "";

    if (records.length === 0) {

        container.innerHTML = `
            <div class="report-empty">
                기록이 없습니다.
            </div>
        `;

        return;
    }

    const sortedOccurrences =
        getOccurrenceCounts(records);

    if (sortedOccurrences.length === 0) {

        container.innerHTML = `
            <div class="report-empty">
                기록이 없습니다.
            </div>
        `;

        return;
    }

    const maxCount = sortedOccurrences[0][1];

    sortedOccurrences.forEach(
        ([occurrence, count]) => {

            const width =
                `${Math.max(
                    (count / maxCount) * 100,
                    8
                )}%`;

            const row = document.createElement("div");

            row.className = "type-bar-row";

            row.innerHTML = `

                <div class="type-bar-label">

                    <span>${escapeHtml(occurrence)}</span>

                    <strong>${count}회</strong>

                </div>

                <div class="type-bar-background">

                    <div
                        class="type-bar-fill"
                        style="width: ${width}"
                    ></div>

                </div>

            `;

            container.appendChild(row);

        }
    );
}


/* ========================================
   오후 수면과 증상 비교
======================================== */

function getSleepComparisonData(
    records,
    dailyRecords
) {

    const sleepDays = {
        slept: [],
        didNotSleep: []
    };


    dailyRecords.forEach(record => {

        const dateKey = record.date;

        if (!dateKey) {
            return;
        }

        if (record.postLunchSleep === true) {

            sleepDays.slept.push(dateKey);

        } else if (record.postLunchSleep === false) {

            sleepDays.didNotSleep.push(dateKey);

        }

    });


    const afternoonRecordsByDate = {};


    records.forEach(record => {

        const date = getRecordDate(record.startedAt);

        if (!date || date.getHours() < 13) {
            return;
        }

        const dateKey = getDateKey(date);

        if (!afternoonRecordsByDate[dateKey]) {
            afternoonRecordsByDate[dateKey] = [];
        }

        afternoonRecordsByDate[dateKey].push(record);

    });


    function calculateStats(dateKeys) {

        const totalDays = dateKeys.length;

        let occurrenceDays = 0;
        let totalSymptoms = 0;
        let totalDuration = 0;

        dateKeys.forEach(dateKey => {

            const recordsForDay =
                afternoonRecordsByDate[dateKey] || [];

            if (recordsForDay.length > 0) {

                occurrenceDays++;

                totalSymptoms += recordsForDay.length;

                recordsForDay.forEach(record => {

                    totalDuration +=
                        Number(record.duration) || 0;

                });

            }

        });


        return {

            totalDays,

            occurrenceDays,

            occurrenceRate:
                totalDays > 0
                    ? Math.round(
                        occurrenceDays / totalDays * 100
                    )
                    : 0,

            totalSymptoms,

            averageSymptoms:
                totalDays > 0
                    ? totalSymptoms / totalDays
                    : 0,

            averageDuration:
                totalSymptoms > 0
                    ? Math.round(
                        totalDuration / totalSymptoms
                    )
                    : 0

        };

    }


    return {
        slept: calculateStats(sleepDays.slept),
        didNotSleep: calculateStats(sleepDays.didNotSleep)
    };

}


function updateSleepComparison(
    records,
    dailyRecords
) {

    const container =
        document.getElementById("sleepComparison");

    container.innerHTML = "";


    const {
        slept: sleptStats,
        didNotSleep: didNotSleepStats
    } = getSleepComparisonData(
        records,
        dailyRecords
    );


    if (
        sleptStats.totalDays === 0 &&
        didNotSleepStats.totalDays === 0
    ) {

        container.innerHTML = `
            <div class="report-empty">
                오후 수면 기록이 없습니다.
            </div>
        `;

        return;
    }


    container.innerHTML = `

        <div
            style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 12px;
            "
        >

            <div
                style="
                    border: 1px solid #e5e5e5;
                    border-radius: 14px;
                    padding: 16px;
                    background: #fff;
                "
            >

                <div
                    style="
                        font-size: 13px;
                        color: #777;
                        margin-bottom: 12px;
                    "
                >
                    수면함
                </div>

                <div
                    style="
                        font-size: 24px;
                        font-weight: 700;
                        margin-bottom: 4px;
                    "
                >
                    ${sleptStats.occurrenceRate}%
                </div>

                <div
                    style="
                        font-size: 12px;
                        color: #777;
                    "
                >
                    오후 증상 발생률
                </div>

            </div>


            <div
                style="
                    border: 1px solid #e5e5e5;
                    border-radius: 14px;
                    padding: 16px;
                    background: #fff;
                "
            >

                <div
                    style="
                        font-size: 13px;
                        color: #777;
                        margin-bottom: 12px;
                    "
                >
                    수면하지 않음
                </div>

                <div
                    style="
                        font-size: 24px;
                        font-weight: 700;
                        margin-bottom: 4px;
                    "
                >
                    ${didNotSleepStats.occurrenceRate}%
                </div>

                <div
                    style="
                        font-size: 12px;
                        color: #777;
                    "
                >
                    오후 증상 발생률
                </div>

            </div>

        </div>


        <div
            style="
                border: 1px solid #e5e5e5;
                border-radius: 14px;
                overflow: hidden;
                background: #fff;
            "
        >

            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    background: #f7f7f7;
                    font-size: 12px;
                    color: #777;
                "
            >

                <span></span>

                <strong style="text-align: center; color: #444;">
                    수면함
                </strong>

                <strong style="text-align: center; color: #444;">
                    수면하지 않음
                </strong>

            </div>


            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>기록일</span>

                <strong style="text-align: center;">
                    ${sleptStats.totalDays}일
                </strong>

                <strong style="text-align: center;">
                    ${didNotSleepStats.totalDays}일
                </strong>

            </div>


            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>오후 증상 횟수</span>

                <strong style="text-align: center;">
                    ${sleptStats.totalSymptoms}회
                </strong>

                <strong style="text-align: center;">
                    ${didNotSleepStats.totalSymptoms}회
                </strong>

            </div>


            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>하루 평균 증상</span>

                <strong style="text-align: center;">
                    ${sleptStats.averageSymptoms.toFixed(1)}회
                </strong>

                <strong style="text-align: center;">
                    ${didNotSleepStats.averageSymptoms.toFixed(1)}회
                </strong>

            </div>


            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>평균 지속시간</span>

                <strong style="text-align: center;">
                    ${formatDuration(sleptStats.averageDuration)}
                </strong>

                <strong style="text-align: center;">
                    ${formatDuration(didNotSleepStats.averageDuration)}
                </strong>

            </div>

        </div>


        <p
            style="
                margin: 12px 2px 0;
                color: #888;
                font-size: 12px;
                line-height: 1.5;
            "
        >
            ※ 수면 기록이 있는 날짜만 비교하며,
            13시 이후 발생한 증상을 기준으로 계산합니다.
        </p>

    `;

}


/* ========================================
   일별 발생
======================================== */


function updateDailyRecords(records) {

    const container =
        document.getElementById("dailyRecords");

    container.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const lastDay = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const dailyCounts = {};

    records.forEach(record => {

        const date = getRecordDate(record.startedAt);

        if (!date) {
            return;
        }

        const key = getDateKey(date);

        dailyCounts[key] =
            (dailyCounts[key] || 0) + 1;

    });

    const maxCount = Math.max(
        ...Object.values(dailyCounts),
        1
    );

    // 1일부터 말일까지 모든 날짜 표시
    for (let day = 1; day <= lastDay; day++) {

        const date = new Date(year, month, day);
        const dateKey = getDateKey(date);

        const count = dailyCounts[dateKey] || 0;

        const column = document.createElement("div");

        column.className = "daily-chart-column";

        const barHeight = count > 0
            ? Math.max(
                (count / maxCount) * 100,
                4
            )
            : 0;

        column.innerHTML = `

            <div class="daily-chart-count">
                ${count > 0 ? count + "회" : ""}
            </div>

            <div class="daily-chart-bar-wrap">

                <div
                    class="daily-chart-bar"
                    style="height: ${barHeight}%"
                ></div>

            </div>

            <div class="daily-chart-label">

                ${month + 1}/${day}
                <br>
                ${["일", "월", "화", "수", "목", "금", "토"][date.getDay()]}

            </div>

        `;

        container.appendChild(column);

    }

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


    const sortedRecords = [...records].sort((a, b) => {

        const dateA = getRecordDate(a.startedAt);
        const dateB = getRecordDate(b.startedAt);

        return dateB - dateA;

    });


    sortedRecords.forEach(record => {

        const date = getRecordDate(record.startedAt);

        if (!date) {
            return;
        }

        const observations =
            Array.isArray(record.observations)
                ? record.observations.join(", ")
                : "-";

        const memo = record.memo || "";

        const item = document.createElement("div");

        item.className = "detail-record";


        const top = document.createElement("div");

        top.className = "detail-record-top";

        const left = document.createElement("div");

        const dateStrong = document.createElement("strong");

        dateStrong.textContent =
            `${date.getMonth() + 1}월 ${date.getDate()}일`;

        const timeSpan = document.createElement("span");

        timeSpan.textContent = date.toLocaleTimeString(
            "ko-KR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

        left.append(dateStrong, timeSpan);

        const durationStrong = document.createElement("strong");

        durationStrong.textContent =
            formatDuration(record.duration || 0);

        top.append(left, durationStrong);


        const info = document.createElement("div");

        info.className = "detail-record-info";


        function addInfo(label, value) {

            const div = document.createElement("div");

            const span = document.createElement("span");
            span.textContent = label;

            const strong = document.createElement("strong");
            strong.textContent = value || "-";

            div.append(span, strong);

            info.appendChild(div);

        }


        addInfo(
            "증상 유형",
            Array.isArray(record.type)
                ? record.type.join(", ")
                : record.type
        );

        addInfo(
            "발생시점",
            Array.isArray(record.occurrence)
                ? record.occurrence.join(", ")
                : record.occurrence
        );

        addInfo(
            "증상 후 상태",
            Array.isArray(record.after)
                ? record.after.join(", ")
                : record.after
        );

        addInfo(
            "관찰 사항",
            observations
        );

        if (memo) {
            addInfo("메모", memo);
        }

        item.append(top, info);

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
   PDF 보고서 데이터 계산
======================================== */

function getDailyReportData(records) {

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const lastDay = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const counts = {};

    records.forEach(record => {

        const date = getRecordDate(record.startedAt);

        if (!date) return;

        const key = getDateKey(date);

        counts[key] = (counts[key] || 0) + 1;

    });

    const result = [];

    for (let day = 1; day <= lastDay; day++) {

        const key = getDateKey(
            new Date(year, month, day)
        );

        result.push({
            day,
            count: counts[key] || 0
        });

    }

    return result;

}


/* ========================================
   증상 유형별 집계
======================================== */

function getTypeCounts(records) {

    const counts = {};

    records.forEach(record => {

        const types = Array.isArray(record.type)
            ? record.type
            : record.type
                ? [record.type]
                : [];

        types.forEach(type => {

            counts[type] = (counts[type] || 0) + 1;

        });

    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1]);

}


/* ========================================
   PDF 보고서 HTML 생성
======================================== */

function createPdfReport(records, dailyRecords) {

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthText = `${year}년 ${month + 1}월`;

    const totalCount = records.length;

    const totalDuration = records.reduce(
        (sum, record) =>
            sum + (Number(record.duration) || 0),
        0
    );

    const averageDuration = totalCount > 0
        ? Math.round(totalDuration / totalCount)
        : 0;

    const longestDuration = records.reduce(
        (max, record) =>
            Math.max(
                max,
                Number(record.duration) || 0
            ),
        0
    );


    const dailyData = getDailyReportData(records);

    const maxDailyCount = Math.max(
        ...dailyData.map(item => item.count),
        1
    );


    const timeRanges = getTimeRanges();
    const timeCounts = getTimeCounts(records);

    const maxTimeCount = Math.max(
        ...timeCounts,
        1
    );


    const occurrenceList = getOccurrenceCounts(records);
    const typeList = getTypeCounts(records);


    const {
        slept,
        didNotSleep
    } = getSleepComparisonData(
        records,
        dailyRecords
    );


    /* 일별 그래프 */

    const dailyHtml = dailyData.map(item => {

        const height = item.count > 0
            ? Math.max(
                item.count / maxDailyCount * 100,
                5
            )
            : 0;

        const showLabel = true;

        return `

            <div class="pdf-day">

                <div class="pdf-day-value">
                    ${item.count > 0 ? item.count : ""}
                </div>

                <div class="pdf-day-bar-area">

                    <div
                        class="pdf-day-bar"
                        style="height:${height}%"
                    ></div>

                </div>

                <div class="pdf-day-label">
    <div>${item.day}</div>
    <div class="pdf-day-week">
        ${["일", "월", "화", "수", "목", "금", "토"][
            new Date(year, month, item.day).getDay()
        ]}
    </div>
</div>

            </div>

        `;

    }).join("");


    /* 시간대별 그래프 */

    const timeHtml = timeRanges.map((range, index) => {

        const count = timeCounts[index];

        const width = count > 0
            ? count / maxTimeCount * 100
            : 0;

        return `

            <div class="pdf-bar-row">

                <span class="pdf-bar-label">
                    ${range.label}
                </span>

                <div class="pdf-bar-background">

                    <div
                        class="pdf-bar-fill"
                        style="width:${width}%"
                    ></div>

                </div>

                <strong class="pdf-bar-count">
                    ${count}회
                </strong>

            </div>

        `;

    }).join("");


    /* 발생시점 */

    const occurrenceHtml = occurrenceList.length

        ? occurrenceList.map(([label, count]) => {

            return `

                <div class="pdf-simple-row">

                    <span>
                        ${escapeHtml(label)}
                    </span>

                    <strong>
                        ${count}회
                    </strong>

                </div>

            `;

        }).join("")

        : `<div class="pdf-empty">기록 없음</div>`;


    /* 증상 유형 */

    const typeHtml = typeList.length

        ? typeList.map(([label, count]) => {

            return `

                <div class="pdf-simple-row">

                    <span>
                        ${escapeHtml(label)}
                    </span>

                    <strong>
                        ${count}회
                    </strong>

                </div>

            `;

        }).join("")

        : `<div class="pdf-empty">기록 없음</div>`;


    /* 수면 비교 */

    const sleepHtml = (

        slept.totalDays === 0 &&
        didNotSleep.totalDays === 0

    )

        ? `

            <div class="pdf-empty">
                오후 수면 기록 없음
            </div>

        `

        : `

            <table class="pdf-sleep-table">

                <thead>

                    <tr>
                        <th>구분</th>
                        <th>수면함</th>
                        <th>수면하지 않음</th>
                    </tr>

                </thead>

                <tbody>

                    <tr>
                        <td>기록일</td>
                        <td>${slept.totalDays}일</td>
                        <td>${didNotSleep.totalDays}일</td>
                    </tr>

                    <tr>
                        <td>오후 증상</td>
                        <td>${slept.totalSymptoms}회</td>
                        <td>${didNotSleep.totalSymptoms}회</td>
                    </tr>

                    <tr>
                        <td>발생률</td>
                        <td>${slept.occurrenceRate}%</td>
                        <td>${didNotSleep.occurrenceRate}%</td>
                    </tr>

                    <tr>
                        <td>평균 지속시간</td>
                        <td>${formatDuration(slept.averageDuration)}</td>
                        <td>${formatDuration(didNotSleep.averageDuration)}</td>
                    </tr>

                </tbody>

            </table>

        `;


    /* PDF 본문 */

    const report = document.createElement("div");

    report.className = "pdf-report";

    report.innerHTML = `

        <style>

            .pdf-report {
    width: 277mm;
    height: 190mm;
    min-height: 190mm;
    box-sizing: border-box;
    padding: 7mm;
    background: #ffffff;
    color: #26332b;
    font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
    overflow: hidden;
    display: grid;
    grid-template-rows: 14mm 24mm 46mm 1fr 7mm;
    gap: 3mm;
}

            .pdf-report * {
                box-sizing: border-box;
            }

            .pdf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1.2mm solid #39845b;
                padding-bottom: 2mm;
            }

            .pdf-title {
                font-size: 21px;
                font-weight: 800;
                color: #286b47;
            }

            .pdf-month {
                font-size: 14px;
                font-weight: 700;
                color: #68766c;
            }

            .pdf-summary {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 3mm;
            }

            .pdf-stat {
                background: #edf5ef;
                border: 1px solid #dbe9de;
                border-radius: 3mm;
                padding: 3mm 5mm;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .pdf-stat-label {
                font-size: 10px;
                color: #66766a;
                margin-bottom: 2mm;
            }

            .pdf-stat-value {
                font-size: 22px;
                font-weight: 800;
                color: #286b47;
            }

            .pdf-section {
                border: 1px solid #dfe7e1;
                border-radius: 2.5mm;
                padding: 3mm;
                background: #ffffff;
                overflow: hidden;
            }

            .pdf-section-title {
                font-size: 12px;
                font-weight: 800;
                color: #286b47;
                margin-bottom: 2.5mm;
                display: flex;
                align-items: center;
                gap: 2mm;
            }

            .pdf-section-title::before {
                content: "";
                width: 1.5mm;
                height: 4mm;
                background: #39845b;
                border-radius: 2px;
            }

            .pdf-daily-chart {
                display: flex;
                align-items: stretch;
                height: 31mm;
                gap: 1mm;
            }

            .pdf-day {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .pdf-day-value {
                height: 4mm;
                font-size: 7px;
                font-weight: 700;
                color: #39845b;
            }

            .pdf-day-bar-area {
                flex: 1;
                width: 100%;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                border-bottom: 1px solid #dce5de;
            }

            .pdf-day-bar {
                width: 65%;
                min-height: 0;
                background: #75aa88;
                border-radius: 1mm 1mm 0 0;
            }

            .pdf-day-label {
    height: 8mm;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 1mm;
    font-size: 7px;
    line-height: 3mm;
    color: #7b857d;
    text-align: center;
    white-space: nowrap;
}


            .pdf-lower {
                display: grid;
                grid-template-columns: 1.12fr 0.95fr 1.15fr;
                gap: 3mm;
                min-height: 0;
            }

            .pdf-lower .pdf-section {
                min-width: 0;
            }

            .pdf-bar-list {
                display: flex;
                flex-direction: column;
                gap: 1.2mm;
            }

            .pdf-bar-row {
                display: grid;
                grid-template-columns: 27mm 1fr 9mm;
                align-items: center;
                gap: 1.5mm;
                min-height: 3.2mm;
            }

            .pdf-bar-label {
                font-size: 7.5px;
                color: #59655c;
                white-space: nowrap;
            }

            .pdf-bar-background {
                height: 2mm;
                border-radius: 2mm;
                background: #edf1ee;
                overflow: hidden;
            }

            .pdf-bar-fill {
                height: 100%;
                background: #70a987;
                border-radius: 2mm;
            }

            .pdf-bar-count {
                text-align: right;
                font-size: 7.5px;
                color: #354a3b;
            }

            .pdf-subtitle {
                margin: 2mm 0 1mm;
                font-size: 9px;
                font-weight: 800;
                color: #52665a;
            }

            .pdf-simple-list {
                display: flex;
                flex-direction: column;
                gap: 1.5mm;
            }

            .pdf-simple-row {
                display: flex;
                justify-content: space-between;
                gap: 2mm;
                border-bottom: 1px solid #edf0ed;
                padding-bottom: 1mm;
                font-size: 8.5px;
                color: #56645a;
            }

            .pdf-simple-row strong {
                color: #286b47;
                white-space: nowrap;
            }

            .pdf-empty {
                color: #999999;
                font-size: 9px;
                padding: 2mm 0;
            }

            .pdf-sleep-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
                text-align: center;
                margin-top: 1mm;
            }

            .pdf-sleep-table th {
                background: #edf5ef;
                color: #38694a;
                font-weight: 800;
            }

            .pdf-sleep-table th,
            .pdf-sleep-table td {
                padding: 2mm 1mm;
                border: 1px solid #dfe7e1;
            }

            .pdf-sleep-table td:first-child {
                text-align: left;
                font-weight: 700;
                color: #59665d;
            }

            .pdf-note {
                display: flex;
                align-items: center;
                font-size: 8px;
                color: #849087;
                border-top: 1px solid #e6ece7;
                padding-top: 1.5mm;
            }

        </style>


        <!-- 제목 -->

        <div class="pdf-header">

            <div class="pdf-title">
                월간 증상 리포트
            </div>

            <div class="pdf-month">
                ${monthText}
            </div>

        </div>


        <!-- 요약 -->

        <div class="pdf-summary">

            <div class="pdf-stat">

                <div class="pdf-stat-label">
                    총 증상 발생
                </div>

                <div class="pdf-stat-value">
                    ${totalCount}회
                </div>

            </div>

            <div class="pdf-stat">

                <div class="pdf-stat-label">
                    평균 지속시간
                </div>

                <div class="pdf-stat-value">
                    ${formatDuration(averageDuration)}
                </div>

            </div>

            <div class="pdf-stat">

                <div class="pdf-stat-label">
                    가장 긴 증상
                </div>

                <div class="pdf-stat-value">
                    ${formatDuration(longestDuration)}
                </div>

            </div>

        </div>


        <!-- 일별 그래프 -->

        <div class="pdf-section">

            <div class="pdf-section-title">
                일별 증상 발생 추이
            </div>

            <div class="pdf-daily-chart">
                ${dailyHtml}
            </div>

        </div>


        <!-- 하단 통계 -->

        <div class="pdf-lower">


            <!-- 시간대별 -->

            <div class="pdf-section">

                <div class="pdf-section-title">
                    시간대별 발생 현황
                </div>

                <div class="pdf-bar-list">
                    ${timeHtml}
                </div>

            </div>


            <!-- 증상 유형 / 발생시점 -->

            <div class="pdf-section">

                <div class="pdf-section-title">
                    증상 유형 및 발생시점
                </div>

                <div class="pdf-subtitle">
                    증상 유형
                </div>

                <div class="pdf-simple-list">
                    ${typeHtml}
                </div>

                <div class="pdf-subtitle">
                    발생시점
                </div>

                <div class="pdf-simple-list">
                    ${occurrenceHtml}
                </div>

            </div>


            <!-- 수면 비교 -->

            <div class="pdf-section">

                <div class="pdf-section-title">
                    오후 수면과 증상 비교
                </div>

                ${sleepHtml}

                <div
                    style="
                        margin-top: 3mm;
                        font-size: 7.5px;
                        color: #8a948d;
                        line-height: 1.5;
                    "
                >
                    ※ 오후 수면 기록이 있는 날짜를 대상으로
                    13시 이후 발생한 증상을 비교합니다.
                </div>

            </div>

        </div>


        <!-- 하단 설명 -->

        <div class="pdf-note">
            ※ 본 보고서는 선택한 월의 Firestore 기록을 기준으로 자동 집계한 자료입니다.
        </div>

    `;


    return report;

}



/* ========================================
   PDF 다운로드
======================================== */

async function downloadPdfReport() {

    const button = document.getElementById(
        "downloadPdfReport"
    );

    if (!window.html2canvas || !window.jspdf) {

        alert(
            "PDF 기능을 불러오지 못했습니다. 페이지를 새로고침해주세요."
        );

        return;
    }

    button.disabled = true;
    button.textContent = "PDF 생성 중...";

    let report = null;

    try {

        const records = currentMonthRecords;
        const dailyRecords = currentMonthDailyRecords;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        report = createPdfReport(
            records,
            dailyRecords
        );

        /* PDF 영역 크기 직접 지정 */

        report.style.position = "absolute";
        report.style.left = "0";
        report.style.top = "0";
        report.style.width = "277mm";
        report.style.height = "190mm";
        report.style.minHeight = "190mm";
        report.style.boxSizing = "border-box";
        report.style.display = "grid";
        report.style.visibility = "visible";
        report.style.opacity = "1";
        report.style.background = "#ffffff";

        document.body.appendChild(report);

        /* 브라우저 렌더링 대기 */

        await new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });

        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        /* 실제 크기 확인 */

        const width = report.offsetWidth;
        const height = report.offsetHeight;

        console.log("PDF 영역 너비:", width);
        console.log("PDF 영역 높이:", height);

        if (width === 0 || height === 0) {
            throw new Error(
                "PDF 보고서 영역의 실제 크기가 0입니다."
            );
        }

        /* HTML을 캔버스로 직접 변환 */

        const canvas = await window.html2canvas(report, {

            scale: 3,

            width: width,
            height: height,

            windowWidth: width,
            windowHeight: height,

            useCORS: true,

            backgroundColor: "#ffffff",

            logging: true,

            scrollX: 0,
            scrollY: 0

        });

        console.log("캔버스 너비:", canvas.width);
        console.log("캔버스 높이:", canvas.height);

        if (canvas.width === 0 || canvas.height === 0) {
            throw new Error(
                "PDF 캔버스 생성에 실패했습니다."
            );
        }

        /* 캔버스를 이미지로 변환 */

        const imageData = canvas.toDataURL("image/png");

        /* A4 가로형 PDF 생성 */

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
            compress: true
        });

        /* A4 가로 297mm × 210mm
           여백 10mm, 보고서 277mm × 190mm */

        pdf.addImage(
            imageData,
            "JPEG",
            10,
            10,
            277,
            190
        );

        /* PDF 저장 */

        pdf.save(
            `${year}년_${month + 1}월_증상리포트.pdf`
        );

    } catch (error) {

        console.error(
            "PDF 보고서 생성 실패:",
            error
        );

        alert(
            "PDF 보고서 생성 실패: " + error.message
        );

    } finally {

        if (report && report.parentNode) {
            report.remove();
        }

        button.disabled = false;

        button.textContent =
            "월간 PDF 보고서 다운로드";

    }

}



/* ========================================
   PDF 다운로드 버튼 연결
======================================== */

document
    .getElementById("downloadPdfReport")
    .addEventListener(
        "click",
        downloadPdfReport
    );


/* ========================================
   리포트 불러오기
======================================== */

async function loadReport() {

    updateMonthTitle();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthStart = new Date(
        year,
        month,
        1
    );

    const nextMonthStart = new Date(
        year,
        month + 1,
        1
    );


    try {

        /* 증상 기록 */

        const seizureQuery = query(
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

            orderBy(
                "startedAt",
                "asc"
            )
        );


        const seizureSnapshot =
            await getDocs(seizureQuery);


        const records = seizureSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));


        /* 오후 수면 기록 */

        const dailyRecordsSnapshot = await getDocs(
            collection(db, "dailyRecords")
        );


        const monthStartKey =
            `${year}-${String(month + 1).padStart(2, "0")}-01`;

        const nextMonthStartKey =
            `${nextMonthStart.getFullYear()}-${String(
                nextMonthStart.getMonth() + 1
            ).padStart(2, "0")}-01`;


        const dailyRecords =
            dailyRecordsSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(record => {

                    return (
                        record.date >= monthStartKey &&
                        record.date < nextMonthStartKey
                    );

                });


        /* 현재 월 데이터 보관 */

        currentMonthRecords = records;
        currentMonthDailyRecords = dailyRecords;


        /* 기존 리포트 화면 */

        updateSummary(records);

        updateTimeBars(records);

        updateOccurrenceBars(records);

        updateDailyRecords(records);

        updateDetailRecords(records);

        updateSleepComparison(
            records,
            dailyRecords
        );


    } catch (error) {

        console.error(
            "리포트 불러오기 실패:",
            error
        );

        alert(
            "리포트를 불러오지 못했습니다. Firebase 연결과 인터넷 상태를 확인해주세요."
        );

    }

}


/* ========================================
   월 이동
======================================== */

document
    .getElementById("prevMonth")
    .addEventListener("click", () => {

        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );

        loadReport();

    });


document
    .getElementById("nextMonth")
    .addEventListener("click", () => {

        currentDate = new Date(
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
