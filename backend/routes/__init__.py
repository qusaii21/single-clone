"""
Adds a lazy-loaded `contact` relationship to the Contact model
so ContactOut serialization works without changing models.py.
"""
# This is handled inline in routes/users.py via selectinload.
# This file intentionally left minimal.
