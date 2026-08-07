from aiogram.fsm.state import State, StatesGroup


class TourSearch(StatesGroup):
    adults = State()
    children = State()
    children_age = State()
    hotel = State()
    dates = State()
    budget = State()
    rest_type = State()
    direction = State()
    confirm = State()


class ExpertChat(StatesGroup):
    active = State()


class LeadForm(StatesGroup):
    waiting_contact = State()
