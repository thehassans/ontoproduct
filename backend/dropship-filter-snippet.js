// Add this after line 1415: if (driverId) match.deliveryBoy = driverId;

// Dropship filtering
if (dropshipOnly || excludeDropship) {
  const dropshippers = await User.find({ role: "dropshipper" }, { _id: 1 }).lean();
  const dropshipperIds = dropshippers.map((d) => String(d._id));
  if (dropshipOnly && dropshipperIds.length > 0) {
    match.createdBy = { $in: dropshipperIds };
  } else if (excludeDropship && dropshipperIds.length > 0) {
    const currentCreatedBy = match.createdBy;
    if (currentCreatedBy && currentCreatedBy.$in) {
      match.createdBy = { $in: currentCreatedBy.$in.filter(id => !dropshipperIds.includes(String(id))) };
    }
  }
}
