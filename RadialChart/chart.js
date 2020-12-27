const drawChart = async () => {
  const data = await d3.json("./data.json")

  // 1) Declare accessors
  const dateParser = d3.timeParse("%Y-%m-%d")

  const temperatureMinAccessor = (d) => d.temperatureMin
  const temperatureMaxAccessor = (d) => d.temperatureMax
  const uvAccessor = (d) => d.uvIndex
  const precipitationAccessor = (d) => d.precipProbability
  const precipitationTypeAccessor = (d) => d.precipType
  const cloudAccessor = (d) => d.cloudCover
  const dateAccessor = (d) => dateParser(d.date)

  // 2) Declare dimensions
  const size = window.innerWidth
  const dimensions = {
    width: size,
    height: size,
    radius: size / 2,
    margin: { top: 180, bottom: 180, right: 180, left: 180 },
    boundedWidth: 0,
    boundedHeight: 0,
    boundedRadius: 0,
  }

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedHeight =
    dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedRadius = dimensions.radius - dimensions.margin.left

  // 3) Draw canvas
  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left + dimensions.boundedRadius}px, ${
        dimensions.margin.top + dimensions.boundedRadius
      }px)`
    )

  // 4) Create scales
  const angleScale = d3
    .scaleTime()
    .domain(d3.extent(data, dateAccessor))
    .range([0, Math.PI * 2])

  const radiusScale = d3
    .scaleLinear()
    .domain(
      d3.extent([
        ...data.map(temperatureMinAccessor),
        ...data.map(temperatureMaxAccessor),
      ])
    )
    .range([0, dimensions.boundedRadius])
    .nice()

  const cloudRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(data, cloudAccessor))
    .range([1, 10])

  const precipitationRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(data, precipitationAccessor))
    .range([0, 8])

  const precipitationTypes = ["rain", "sleet", "snow"]
  const precipitationTypeColorScale = d3
    .scaleOrdinal()
    .domain(precipitationTypes)
    .range(["#54a0ff", "#636e72", "#b2bec3"])

  const getAngleForCoordinates = (x, y) => Math.atan2(x, y)

  const getCoordinatesForAngle = (angle, offset = 1) => [
    Math.cos(angle - Math.PI / 2) * dimensions.boundedRadius * offset,
    Math.sin(angle - Math.PI / 2) * dimensions.boundedRadius * offset,
  ]

  const getXFromDataPoint = (d, offset = 1.4) => {
    return getCoordinatesForAngle(angleScale(dateAccessor(d)), offset)[0]
  }

  const getYFromDataPoint = (d, offset = 1.4) => {
    return getCoordinatesForAngle(angleScale(dateAccessor(d)), offset)[1]
  }

  // 6) Draw peripherals | Part I
  const gradientID = "gradientID"
  const gradient = wrapper
    .append("defs")
    .append("radialGradient")
    .attr("id", gradientID)

  const numOfStops = 10
  const gradientColorScale = d3.interpolateYlOrRd
  d3.range(numOfStops).forEach((value) => {
    gradient
      .append("stop")
      .attr("offset", `${(value * 100) / (numOfStops - 1)}%`)
      .attr("stop-color", gradientColorScale(value / (numOfStops - 1)))
  })

  const peripheralsID = "peripherals"
  const peripherals = bounds.append("g").attr("id", peripheralsID)

  d3.select(`#${peripheralsID}`)
  const months = d3.timeMonth.range(...angleScale.domain())

  months.forEach((month) => {
    const angle = angleScale(month)

    const [x, y] = getCoordinatesForAngle(angle, 1)
    peripherals
      .append("line")
      .attr("x2", x)
      .attr("y2", y)
      .attr("id", "grid-line")

    const [labelX, labelY] = getCoordinatesForAngle(angle, 1.38)
    peripherals
      .append("text")
      .attr("x", labelX)
      .attr("y", labelY)
      .attr("id", "tick-label")
      .text(d3.timeFormat("%b")(month))
      .style(
        "text-anchor",
        Math.abs(labelX) < 5 ? "middle" : labelX > 0 ? "start" : `end`
      )
  })

  const temperatureTicks = radiusScale.ticks(6)
  const grids = bounds.selectAll("#temp-circle").data(temperatureTicks)

  grids
    .join("circle")
    .attr("r", (d) => radiusScale(d))
    .attr("id", "grid-line")

  grids
    .join("rect")
    .filter((d) => d > 1)
    .attr("y", (d) => -radiusScale(d) - 10)
    .attr("width", 55)
    .attr("height", 20)
    .attr("fill", "white")
    .attr("x", 5)

  grids
    .join("text")
    .filter((d) => d > 1)
    .attr("x", 4)
    .attr("y", (d) => -radiusScale(d) + 2)
    .attr("id", "tick-label-temp")
    .html((d) => `${d} *F`)
    .attr("x", 5)

  // 5) Draw data
  bounds
    .append("circle")
    .attr("r", radiusScale(32))
    .attr("id", "freezing-circle")

  const areaGenerator = d3
    .areaRadial()
    .angle((d) => angleScale(dateAccessor(d)))
    .innerRadius((d) => radiusScale(temperatureMinAccessor(d)))
    .outerRadius((d) => radiusScale(temperatureMaxAccessor(d)))

  bounds
    .append("path")
    .attr("d", areaGenerator(data))
    .attr("fill", `url(#${gradientID})`)

  const uvIndexThreshold = 8
  const uvOffset = 0.95
  const uvGroup = bounds.append("g")
  uvGroup
    .selectAll("line")
    .data(data.filter((d) => uvAccessor(d) > uvIndexThreshold))
    .join("line")
    .attr("id", "uv-line")
    .attr("x1", (d) => getXFromDataPoint(d, uvOffset))
    .attr("x2", (d) => getXFromDataPoint(d, uvOffset + 0.1))
    .attr("y1", (d) => getYFromDataPoint(d, uvOffset))
    .attr("y2", (d) => getYFromDataPoint(d, uvOffset + 0.1))

  const cloudOffset = 1.27
  const cloudGroup = bounds.append("g")
  cloudGroup
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => getXFromDataPoint(d, cloudOffset))
    .attr("cy", (d) => getYFromDataPoint(d, cloudOffset))
    .attr("r", (d) => cloudRadiusScale(cloudAccessor(d)))
    .attr("id", "cloud-dot")

  const precipitationOffset = 1.14
  const precipitationGroup = bounds.append("g")
  precipitationGroup
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => getXFromDataPoint(d, precipitationOffset))
    .attr("cy", (d) => getYFromDataPoint(d, precipitationOffset))
    .attr("r", (d) => precipitationRadiusScale(precipitationAccessor(d)))
    .style("fill", (d) =>
      precipitationTypeColorScale(precipitationTypeAccessor(d))
    )
    .attr("id", "precip-dot")

  // 6) Draw peripherals | Part II
  const notesGroup = bounds.append("g")
  const drawNote = (angle, offset, text) => {
    const [x1, y1] = getCoordinatesForAngle(angle, offset)
    const [x2, y2] = getCoordinatesForAngle(angle, 1.6)

    notesGroup
      .append("line")
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y1)
      .attr("y2", y2)
      .attr("class", "note-line")

    notesGroup
      .append("text")
      .attr("x", x2 + 7)
      .attr("y", y2)
      .text(text)
      .attr("class", "note-text")
  }

  drawNote(Math.PI * 0.23, cloudOffset, "Cloud cover")
  drawNote(Math.PI * 0.26, precipitationOffset, "Precipitation")

  drawNote(Math.PI * 0.734, uvOffset, `UV Index over ${uvIndexThreshold}`)
  drawNote(Math.PI * 0.26, precipitationOffset, "Precipitation")

  drawNote(Math.PI * 0.7, 0.5, "Temperature")
  drawNote(
    Math.PI * 0.9,
    radiusScale(32) / dimensions.boundedRadius,
    "Freezing Temperature"
  )

  precipitationTypes.forEach((type, index) => {
    const labelCoordinates = getCoordinatesForAngle(Math.PI * 0.26, 1.6)
    notesGroup
      .append("circle")
      .attr("cx", labelCoordinates[0] + 15)
      .attr("cy", labelCoordinates[1] + 16 * (index + 1))
      .attr("r", 4)
      .style("opacity", 0.7)
      .attr("fill", precipitationTypeColorScale(type))

    notesGroup
      .append("text")
      .attr("x", labelCoordinates[0] + 25)
      .attr("y", labelCoordinates[1] + 16 * (index + 1))
      .attr("class", "note-text")
      .text(type)
  })

  // 7) Setup interactions
  const listenerCircle = bounds
    .append("circle")
    .attr("class", "listener-circle")
    .attr("r", dimensions.width / 2)
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave)

  function onMouseMove(e) {
    const [x, y] = d3.pointer(e)
  }
  function onMouseLeave() {}

  const tooltip = d3.select("#tooltip")
  const tooltipLine = bounds.append("path").attr("class", "tooltip-line")
}

drawChart()
