"""
Seed problems into the database.

Run this once to populate initial coding problems:
    python seed_problems.py
"""

import json
from db import engine, Base, SessionLocal
from models import Problem
import sys

# Create tables
Base.metadata.create_all(bind=engine)

# Define problems
PROBLEMS = [
    {
        "problem_id": "two_sum",
        "title": "Two Sum",
        "description": """
Given an array of integers `nums` and an integer `target`, 
return the indices of the two numbers that add up to the target.

You may assume that each input has exactly one solution, 
and you cannot use the same element twice.

**Constraints:**
- 2 <= nums.length <= 104
- -109 <= nums[i] <= 109
- -109 <= target <= 109

**Example:**
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] == 2 + 7 == 9, so return [0, 1].
        """.strip(),
        "function_signature": "def solution(nums, target):",
        "language": "python",
        "difficulty": "easy",
        "sample_tests": [
            {
                "input": {"nums": [2, 7, 11, 15], "target": 9},
                "expected_output": [0, 1]
            },
            {
                "input": {"nums": [3, 2, 4], "target": 6},
                "expected_output": [1, 2]
            }
        ],
        "hidden_tests": [
            {
                "input": {"nums": [2, 7, 11, 15], "target": 9},
                "expected_output": [0, 1]
            },
            {
                "input": {"nums": [3, 2, 4], "target": 6},
                "expected_output": [1, 2]
            },
            {
                "input": {"nums": [3, 3], "target": 6},
                "expected_output": [0, 1]
            },
            {
                "input": {"nums": [1, 2, 3, 4, 5], "target": 9},
                "expected_output": [3, 4]
            },
            {
                "input": {"nums": [-1, -2, -3, 5, 10], "target": 7},
                "expected_output": [2, 4]
            },
            {
                "input": {"nums": [0, 0], "target": 0},
                "expected_output": [0, 1]
            },
            {
                "input": {"nums": [1, 2, 3, 6, 8], "target": 14},
                "expected_output": [2, 4]
            },
            {
                "input": {"nums": [1000000, 1, 2], "target": 1000002},
                "expected_output": [0, 2]
            },
        ],
        "time_limit_sec": 1.0,
        "memory_limit_mb": 256
    },
    {
        "problem_id": "reverse_string",
        "title": "Reverse String",
        "description": """
Write a function that reverses a string.

**Example:**
Input: s = "hello"
Output: "olleh"

Input: s = "a"
Output: "a"
        """.strip(),
        "function_signature": "def solution(s):",
        "language": "python",
        "difficulty": "easy",
        "sample_tests": [
            {
                "input": {"s": "hello"},
                "expected_output": "olleh"
            },
            {
                "input": {"s": "a"},
                "expected_output": "a"
            }
        ],
        "hidden_tests": [
            {
                "input": {"s": "hello"},
                "expected_output": "olleh"
            },
            {
                "input": {"s": "a"},
                "expected_output": "a"
            },
            {
                "input": {"s": ""},
                "expected_output": ""
            },
            {
                "input": {"s": "abc"},
                "expected_output": "cba"
            },
            {
                "input": {"s": "racecar"},
                "expected_output": "racecar"
            },
            {
                "input": {"s": "12345"},
                "expected_output": "54321"
            },
            {
                "input": {"s": "Python"},
                "expected_output": "nohtyP"
            },
            {
                "input": {"s": "a" * 1000},
                "expected_output": "a" * 1000
            },
        ],
        "time_limit_sec": 1.0,
        "memory_limit_mb": 256
    },
    {
        "problem_id": "is_palindrome",
        "title": "Valid Palindrome",
        "description": """
A phrase is a palindrome if, after converting all uppercase letters 
into lowercase letters and removing all non-alphanumeric characters, 
it reads the same forward and backward.

Alphanumeric characters include letters and numbers.

Given a string `s`, return True if it is a palindrome, or False otherwise.

**Example:**
Input: s = "A man, a plan, a canal: Panama"
Output: True

Input: s = "race a car"
Output: False
        """.strip(),
        "function_signature": "def solution(s):",
        "language": "python",
        "difficulty": "easy",
        "sample_tests": [
            {
                "input": {"s": "A man, a plan, a canal: Panama"},
                "expected_output": True
            },
            {
                "input": {"s": "race a car"},
                "expected_output": False
            }
        ],
        "hidden_tests": [
            {
                "input": {"s": "A man, a plan, a canal: Panama"},
                "expected_output": True
            },
            {
                "input": {"s": "race a car"},
                "expected_output": False
            },
            {
                "input": {"s": " "},
                "expected_output": True
            },
            {
                "input": {"s": "0P"},
                "expected_output": False
            },
            {
                "input": {"s": "a"},
                "expected_output": True
            },
            {
                "input": {"s": "ab_a"},
                "expected_output": True
            },
            {
                "input": {"s": "ab a"},
                "expected_output": True
            },
            {
                "input": {"s": "Madam, I'm Adam"},
                "expected_output": True
            },
        ],
        "time_limit_sec": 1.0,
        "memory_limit_mb": 256
    }
]

def seed():
    db = SessionLocal()
    
    for problem_data in PROBLEMS:
        # Check if already exists
        existing = db.query(Problem).filter(
            Problem.problem_id == problem_data["problem_id"]
        ).first()
        
        if existing:
            print(f"✓ Problem '{problem_data['problem_id']}' already exists, skipping...")
            continue
        
        # Create new problem
        problem = Problem(
            problem_id=problem_data["problem_id"],
            title=problem_data["title"],
            description=problem_data["description"],
            function_signature=problem_data["function_signature"],
            language=problem_data["language"],
            difficulty=problem_data["difficulty"],
            sample_tests=problem_data["sample_tests"],
            hidden_tests=problem_data["hidden_tests"],
            time_limit_sec=problem_data["time_limit_sec"],
            memory_limit_mb=problem_data["memory_limit_mb"]
        )
        
        db.add(problem)
        db.commit()
        
        print(f"✓ Problem '{problem_data['problem_id']}' created successfully")
    
    db.close()
    print("\n✓ Seeding complete!")

if __name__ == "__main__":
    seed()
