"""Lottery section definitions.

Each section represents a category of lottery statistics on the myhora.com page.
The marker string is used to locate the section in the crawled markdown.
"""

LOTTERY_SECTIONS: list[dict] = [
    {
        "name": "เลข 2 ตัวบน",
        "description": "Last 2 digits of 1st prize (top)",
        "digit_positions": ["สิบ", "หน่วย"],
        "marker": "สถิติหวย เลข 2 ตัวบน ที่ออกย้อนหลัง",
    },
    {
        "name": "เลขท้าย 2 ตัว",
        "description": "Last 2 digits (bottom)",
        "digit_positions": ["สิบ", "หน่วย"],
        "marker": "สถิติหวย เลขท้าย 2 ตัว (2 ตัวล่าง)",
    },
    {
        "name": "เลข 3 ตัวบน (เลขท้าย)",
        "description": "Last 3 digits of 1st prize (top)",
        "digit_positions": ["ร้อย", "สิบ", "หน่วย"],
        "marker": "สถิติหวย เลข 3 ตัวบน ที่ออกย้อนหลัง",
    },
    {
        "name": "เลข 3 ตัวบน (เลขหน้า)",
        "description": "First 3 digits of 1st prize (top)",
        "digit_positions": ["ร้อย", "สิบ", "หน่วย"],
        "marker": "สถิติหวย เลข 3 ตัวบน (เลขหน้า)",
    },
    {
        "name": "เลขท้าย 3 ตัว",
        "description": "Last 3 digits (bottom)",
        "digit_positions": ["ร้อย", "สิบ", "หน่วย"],
        "marker": "สถิติหวย เลขท้าย 3 ตัว (3 ตัวล่าง)",
    },
    {
        "name": "เลขหน้า 3 ตัว",
        "description": "Front 3 digits (bottom)",
        "digit_positions": ["ร้อย", "สิบ", "หน่วย"],
        "marker": "สถิติหวย เลขหน้า 3 ตัว (3 ตัวหน้า)",
    },
]
