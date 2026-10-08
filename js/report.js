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
   날짜 키
   예: 2026-10-06
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
   발생시점
======================================== */

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


    const sortedOccurrences =
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1]);


    if (sortedOccurrences.length === 0) {

        container.innerHTML = `
            <div class="report-empty">
                기록이 없습니다.
            </div>
        `;

        return;
    }


    const maxCount =
        sortedOccurrences[0][1];


    sortedOccurrences.forEach(
        ([occurrence, count]) => {

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
                        ${occurrence}
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

        }
    );
}



/* ========================================
   오후 수면과 증상 비교
======================================== */

function updateSleepComparison(
    records,
    dailyRecords
) {

    const container =
        document.getElementById("sleepComparison");

    container.innerHTML = "";


    /*
        수면 기록이 실제로 존재하는 날짜만
        비교 대상으로 사용한다.

        true  = 수면함
        false = 수면하지 않음
    */

    const sleepDays = {
        slept: [],
        didNotSleep: []
    };


    dailyRecords.forEach(record => {

        const dateKey =
            record.date;

        if (!dateKey) {
            return;
        }


        if (record.postLunchSleep === true) {

            sleepDays.slept.push(dateKey);

        } else if (
            record.postLunchSleep === false
        ) {

            sleepDays.didNotSleep.push(dateKey);
        }
    });


    /*
        날짜별로 13시 이후 증상을 묶는다.
    */

    const afternoonRecordsByDate = {};


    records.forEach(record => {

        const date =
            getRecordDate(record.startedAt);

        if (!date) {
            return;
        }


        const hour =
            date.getHours();


        /*
            13:00 이후만 오후 증상으로 계산
        */

        if (hour < 13) {
            return;
        }


        const dateKey =
            getDateKey(date);


        if (
            !afternoonRecordsByDate[dateKey]
        ) {

            afternoonRecordsByDate[dateKey] = [];
        }


        afternoonRecordsByDate[dateKey].push(
            record
        );
    });


    /*
        수면 여부별 통계 계산
    */

    function calculateStats(dateKeys) {

        const totalDays =
            dateKeys.length;


        let occurrenceDays = 0;
        let totalSymptoms = 0;
        let totalDuration = 0;


        dateKeys.forEach(dateKey => {

            const recordsForDay =
                afternoonRecordsByDate[dateKey] || [];


            if (recordsForDay.length > 0) {

                occurrenceDays++;

                totalSymptoms +=
                    recordsForDay.length;

                recordsForDay.forEach(record => {

                    totalDuration +=
                        Number(record.duration) || 0;

                });
            }
        });


        /*
            오후 증상 발생률
            = 오후 증상이 한 번이라도 발생한 날 /
              수면 기록이 있는 날
        */

        const occurrenceRate =
            totalDays > 0
                ? Math.round(
                    (occurrenceDays / totalDays) * 100
                )
                : 0;


        /*
            하루 평균 증상
            = 오후 증상 횟수 / 기록일
        */

        const averageSymptoms =
            totalDays > 0
                ? totalSymptoms / totalDays
                : 0;


        /*
            증상이 실제 발생한 경우의 평균 지속시간
        */

        const averageDuration =
            totalSymptoms > 0
                ? Math.round(
                    totalDuration / totalSymptoms
                )
                : 0;


        return {
            totalDays,
            occurrenceDays,
            occurrenceRate,
            totalSymptoms,
            averageSymptoms,
            averageDuration
        };
    }


    const sleptStats =
        calculateStats(
            sleepDays.slept
        );


    const didNotSleepStats =
        calculateStats(
            sleepDays.didNotSleep
        );


    /*
        수면 기록 자체가 하나도 없는 경우
    */

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


    /*
        비교표
    */

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

            <!-- 표 제목 -->

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

                <strong
                    style="
                        text-align: center;
                        color: #444;
                    "
                >
                    수면함
                </strong>

                <strong
                    style="
                        text-align: center;
                        color: #444;
                    "
                >
                    수면하지 않음
                </strong>

            </div>


            <!-- 기록일 -->

            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>
                    기록일
                </span>

                <strong style="text-align: center;">
                    ${sleptStats.totalDays}일
                </strong>

                <strong style="text-align: center;">
                    ${didNotSleepStats.totalDays}일
                </strong>

            </div>


            <!-- 오후 증상 횟수 -->

            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>
                    오후 증상 횟수
                </span>

                <strong style="text-align: center;">
                    ${sleptStats.totalSymptoms}회
                </strong>

                <strong style="text-align: center;">
                    ${didNotSleepStats.totalSymptoms}회
                </strong>

            </div>


            <!-- 하루 평균 증상 -->

            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>
                    하루 평균 증상
                </span>

                <strong style="text-align: center;">
                    ${sleptStats.averageSymptoms.toFixed(1)}회
                </strong>

                <strong style="text-align: center;">
                    ${didNotSleepStats.averageSymptoms.toFixed(1)}회
                </strong>

            </div>


            <!-- 평균 지속시간 -->

            <div
                style="
                    display: grid;
                    grid-template-columns: 1.3fr 1fr 1fr;
                    padding: 13px 14px;
                    border-top: 1px solid #eee;
                    font-size: 13px;
                "
            >

                <span>
                    평균 지속시간
                </span>

                <strong style="text-align: center;">
                    ${formatDuration(
                        sleptStats.averageDuration
                    )}
                </strong>

                <strong style="text-align: center;">
                    ${formatDuration(
                        didNotSleepStats.averageDuration
                    )}
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
                        ${
                            Array.isArray(record.type)
                                ? record.type.join(", ")
                                : record.type || "-"
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        발생시점
                    </span>

                    <strong>
                        ${
                            Array.isArray(record.occurrence)
                                ? record.occurrence.join(", ")
                                : record.occurrence || "-"
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        증상 후 상태
                    </span>

                    <strong>
                        ${
                            Array.isArray(record.after)
                                ? record.after.join(", ")
                                : record.after || "-"
                        }
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

        /* ========================================
           증상 기록
        ======================================== */

        const seizureQuery =
            query(
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


        const records =
            seizureSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));


        /* ========================================
           오후 수면 기록
        ======================================== */

        const dailyRecordsSnapshot =
            await getDocs(
                collection(
                    db,
                    "dailyRecords"
                )
            );


        const monthStartKey =
            `${year}-${String(
                month + 1
            ).padStart(2, "0")}-01`;


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


        /* ========================================
           리포트
        ======================================== */

        updateSummary(records);

        updateTimeBars(records);

        updateOccurrenceBars(records);

        updateDailyRecords(records);

        updateDetailRecords(records);


        /* ========================================
           오후 수면 비교
        ======================================== */

        updateSleepComparison(
            records,
            dailyRecords
        );


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