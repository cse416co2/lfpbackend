import { Event } from "../models/eventModel.js";
import { Scenario } from "../models/scenarioModel.js";
import { logScenarioActivity } from "../controllers/loggingController.js";

export const addEvent = async (req, res) => {
  try {
    const {
      scenarioId,
      type,
      startYear,
      duration,
      amount,
      expectedChange,
      inflationAdjusted,
      discretionary,
      assetAllocation,
      isJointIncome,
      isJointExpense,
      primaryOwnerShare,
    } = req.body;

    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: req.userId,
    });
    if (!scenario) return res.status(404).json({ message: "Scenario not found" });

    if (type === "spouseDeath") {
      const existingDeathEvent = await Event.findOne({ 
        scenario: scenarioId, 
        type: "spouseDeath" 
      });
      if (existingDeathEvent) {
        return res.status(400).json({ 
          message: "A spouse death event already exists for this scenario" 
        });
      }
      if (amount || duration !== 0 || expectedChange) {
        return res.status(400).json({ 
          message: "Spouse death events should only have a start year" 
        });
      }
    }

    const newEvent = new Event({
      type,
      scenario: scenarioId,
      startYear,
      duration: type === "spouseDeath" ? 0 : duration,
      amount: type === "spouseDeath" ? 0 : amount,
      expectedChange: type === "spouseDeath" ? 0 : expectedChange,
      inflationAdjusted: type === "spouseDeath" ? false : inflationAdjusted,
      discretionary: type === "spouseDeath" ? false : discretionary,
      assetAllocation: type === "spouseDeath" ? [] : assetAllocation,
      isJointIncome,
      isJointExpense,
      primaryOwnerShare,
    });

    await newEvent.save();

    if (type !== "spouseDeath") {
      scenario.events.push(newEvent._id);
      
      if (type === "investment" && Array.isArray(assetAllocation) && assetAllocation.length > 0) {
        assetAllocation.forEach(({ investment, percentage }) => {
          const valueToAdd = (amount * percentage) / 100;
          const existing = scenario.investmentTypes.find((i) =>
            i.investment.equals(investment)
          );
          if (existing) {
            existing.value += valueToAdd;
          } else {
            scenario.investmentTypes.push({ investment, value: valueToAdd });
          }
        });
      }
      
      await scenario.save();
    }

    logScenarioActivity(
      scenarioId,
      type === "spouseDeath" 
        ? `Spouse death event added in year ${startYear}`
        : `Event added: ${type}, Amount: ${amount}, Start Year: ${startYear}`
    );

    res.status(201).json({ 
      message: type === "spouseDeath" 
        ? "Spouse death event added successfully" 
        : "Event added successfully",
      event: newEvent 
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding event", error: error.message });
  }
};

export const getEventsByScenarioId = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await Scenario.findById(scenarioId).populate("events");

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    res.status(200).json(scenario.events);
  } catch (error) {
    res.status(500).json({ message: "Error fetching events", error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("scenario");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const scenario = await Scenario.findOne({ events: event._id });

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    const eventWithScenarioId = {
      ...event.toObject(),
      scenarioId: scenario._id,
    };

    res.status(200).json(eventWithScenarioId);
  } catch (error) {
    res.status(500).json({ message: "Error fetching event", error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    logScenarioActivity(
      updatedEvent.scenario,
      `Event updated: ${updatedEvent.type}, Amount: ${updatedEvent.amount}`
    );

    res.status(200).json({ 
      message: "Event updated successfully", 
      event: updatedEvent 
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating event", error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await Scenario.updateOne(
      { events: event._id },
      { $pull: { events: event._id } }
    );

    await Event.findByIdAndDelete(req.params.id);

    logScenarioActivity(
      event.scenario,
      `Event deleted: ${event.type}, Amount: ${event.amount}`
    );

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting event", error: error.message });
  }
};